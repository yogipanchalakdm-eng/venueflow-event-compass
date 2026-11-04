import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Department } from "./departments";
import { canManageAccount, canManageTeam, memberEmail, newMemberSchema, type Caller, type StaffRole } from "./team";

async function loadCaller(supabase: SupabaseClient, userId: string): Promise<Caller> {
  const { data } = await supabase.from("user_roles").select("role, department").eq("user_id", userId);
  const rows = (data ?? []) as { role: StaffRole; department: Department | null }[];
  const master = rows.find((r) => r.role === "master");
  if (master) return { role: "master", department: null };
  const row = rows.find((r) => r.role === "lead") ?? rows[0];
  return row ? { role: row.role, department: row.department } : { role: null, department: null };
}

/** Master or a team's lead account: create a login for someone on that team. */
export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => newMemberSchema.parse(data))
  .handler(async ({ data, context }) => {
    const caller = await loadCaller(context.supabase as never, context.userId);
    if (!canManageTeam(caller, data.department)) throw new Error("You can only add people to your own team");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await supabaseAdmin.from("user_roles").select("id").ilike("username", data.username).limit(1);
    if (taken?.length) throw new Error("That username is taken");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: memberEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });
    if (error || !created.user) {
      throw new Error(/already/i.test(error?.message ?? "") ? "That username is taken" : "Couldn't create the account");
    }

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: "member",
      department: data.department,
      display_name: data.displayName,
      username: data.username,
    });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Couldn't create the account");
    }
    return { userId: created.user.id, username: data.username };
  });

async function loadTarget(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role, department").eq("user_id", userId);
  const rows = (data ?? []) as { role: StaffRole; department: Department | null }[];
  const target = rows.find((r) => r.role === "master") ?? rows.find((r) => r.role === "lead") ?? rows[0];
  return { supabaseAdmin, target };
}

/** Master or the team's lead: remove a team member's login. Team accounts and Master can't be removed. */
export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const caller = await loadCaller(context.supabase as never, context.userId);
    const { supabaseAdmin, target } = await loadTarget(data.userId);
    if (!target || target.role !== "member") throw new Error("Only team member logins can be removed");
    if (!canManageAccount(caller, target)) throw new Error("You can only manage your own team");

    await supabaseAdmin.from("requests").update({ assigned_to: null }).eq("assigned_to", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Couldn't remove that login");
    return { ok: true };
  });

/** Master: any account. Team lead: members of their own team. */
export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(10).max(72) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const caller = await loadCaller(context.supabase as never, context.userId);
    const { supabaseAdmin, target } = await loadTarget(data.userId);
    if (!target || !canManageAccount(caller, target)) throw new Error("You can't reset this password");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
