import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { submissionSchema } from "./request-schema";
import {
  findMatchingEvent,
  normalizeEventName,
  requestDateRange,
  submissionDateRange,
} from "./event-matching";

const BUCKET = "request-attachments";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/;

/** Public: anyone filling in the request form can send it. */
export const submitRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submissionSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Uploaded files must live in this bucket under a fresh folder.
    for (const r of data.requests) {
      for (const a of r.attachments) {
        if (!/^uploads\/[0-9a-f-]{36}\/[^/]+$/.test(a.path)) throw new Error("Invalid attachment");
      }
    }

    const range = submissionDateRange(data.eventDate, data.requests);
    const normalized = normalizeEventName(data.eventName);

    const { data: candidates, error: candErr } = await supabaseAdmin
      .from("events")
      .select("id, normalized_name, start_date, end_date")
      .eq("normalized_name", normalized);
    if (candErr) throw new Error("Could not save your request. Please try again.");

    let eventId = findMatchingEvent(candidates ?? [], data.eventName, range)?.id;
    let merged = Boolean(eventId);

    if (!eventId) {
      const { data: created, error } = await supabaseAdmin
        .from("events")
        .insert({
          name: data.eventName,
          normalized_name: normalized,
          start_date: range.start,
          end_date: range.end,
          source: "request",
        })
        .select("id")
        .single();
      if (error || !created) throw new Error("Could not save your request. Please try again.");
      eventId = created.id;
      merged = false;
    }

    const { data: submission, error: subErr } = await supabaseAdmin
      .from("submissions")
      .insert({
        event_id: eventId,
        requester_name: data.requesterName,
        phone: data.phone,
        email: data.email,
        team: data.team,
        event_name: data.eventName,
        event_date: data.eventDate,
      })
      .select("id")
      .single();
    if (subErr || !submission) throw new Error("Could not save your request. Please try again.");

    const rows = data.requests.map((r) => {
      const { start, end } = requestDateRange(r as { department: string; details: Record<string, unknown> });
      return {
        submission_id: submission.id,
        event_id: eventId!,
        department: r.department,
        details: r.details as never,
        comments: r.comments || null,
        attachments: r.attachments as never,
        start_date: start,
        end_date: end,
      };
    });
    const { error: reqErr } = await supabaseAdmin.from("requests").insert(rows);
    if (reqErr) {
      console.error("request insert failed", reqErr);
      await supabaseAdmin.from("submissions").delete().eq("id", submission.id);
      throw new Error("Could not save your request. Please try again.");
    }

    return {
      reference: submission.id.slice(0, 8).toUpperCase(),
      merged,
      departments: data.requests.map((r) => r.department),
    };
  });

/** Public: hands out one-time upload slots for request attachments. */
export const createUploadSlots = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        files: z
          .array(
            z.object({
              name: z.string().min(1).max(200),
              size: z.number().int().min(1).max(MAX_FILE_BYTES),
              type: z.string().regex(ALLOWED_TYPES, "Only images and PDFs are allowed"),
            }),
          )
          .min(1)
          .max(10),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const folder = crypto.randomUUID();
    const slots = [];
    for (const f of data.files) {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120) || "file";
      const path = `uploads/${folder}/${Date.now().toString(36)}-${safe}`;
      const { data: signed, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !signed) throw new Error("Upload is unavailable right now. Please try again.");
      slots.push({ path, token: signed.token, name: f.name, size: f.size, type: f.type });
    }
    return { slots };
  });

/** Staff: bring events in from a calendar file without duplicating ones already here. */
export const importCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        events: z
          .array(
            z.object({
              summary: z.string().trim().min(1).max(200),
              start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              location: z.string().max(300).optional(),
              description: z.string().max(2000).optional(),
            }),
          )
          .min(1)
          .max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Only staff accounts can import calendars");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const names = Array.from(new Set(data.events.map((e) => normalizeEventName(e.summary))));
    const { data: existing } = await supabaseAdmin
      .from("events")
      .select("id, normalized_name, start_date, end_date")
      .in("normalized_name", names);
    const known = [...(existing ?? [])];

    let added = 0;
    let synced = 0;
    for (const e of data.events) {
      const match = findMatchingEvent(known, e.summary, { start: e.start, end: e.end });
      if (match) {
        synced++;
        continue;
      }
      const row = {
        name: e.summary,
        normalized_name: normalizeEventName(e.summary),
        start_date: e.start,
        end_date: e.end < e.start ? e.start : e.end,
        source: "import",
        location: e.location ?? null,
        description: e.description ?? null,
        created_by: context.userId,
      };
      const { data: inserted, error } = await supabaseAdmin.from("events").insert(row).select("id").single();
      if (!error && inserted) {
        known.push({ id: inserted.id, normalized_name: row.normalized_name, start_date: row.start_date, end_date: row.end_date });
        added++;
      }
    }
    return { added, synced };
  });

/** Master only: set a new password for any staff account. */
export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(10).max(72) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isMaster } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "master",
    });
    if (!isMaster) throw new Error("Only the master account can reset passwords");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
