import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS, DEPT, type Department } from "@/lib/departments";
import { submissionSchema } from "@/lib/request-schema";
import { createUploadSlots, submitRequest } from "@/lib/requests.functions";
import { Field, TextArea, TextInput, Label } from "./fields";
import { AttachmentsField } from "./AttachmentsField";
import { defaultDetails, emptyDraft, isMapDept, mapSources, toPayloadDetails, type DraftRequest } from "./draft";
import {
  AudioVideoSection,
  FacilitiesSection,
  ItNetworkSection,
  KitchenSection,
  ParkingSection,
  PhotoVideoSection,
} from "./DepartmentSections";

type About = { requesterName: string; phone: string; email: string; eventName: string; eventDate: string; team: string };
const emptyAbout: About = { requesterName: "", phone: "", email: "", eventName: "", eventDate: "", team: "" };

function SectionCard({ step, title, aside, children }: { step: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-selected font-display text-sm font-semibold text-primary">
          {step}
        </span>
        <h2 className="flex-1 text-xl font-semibold sm:text-2xl">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function RequestForm() {
  const [about, setAbout] = useState<About>(emptyAbout);
  const [drafts, setDrafts] = useState<DraftRequest[]>([emptyDraft()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { reference: string; merged: boolean; departments: Department[]; eventName: string }>(null);

  const submitFn = useServerFn(submitRequest);
  const uploadFn = useServerFn(createUploadSlots);

  const setA = (k: keyof About, v: string) => setAbout((a) => ({ ...a, [k]: v }));
  const updateDraft = (key: string, fn: (d: DraftRequest) => DraftRequest) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? fn(d) : d)));

  const chooseDept = (key: string, dept: Department) =>
    updateDraft(key, (d) => {
      if (d.department === dept) return d;
      const details = defaultDetails(dept, about.eventDate);
      return { ...d, department: dept, details };
    });

  const removeDraft = (key: string) =>
    setDrafts((ds) =>
      ds
        .filter((d) => d.key !== key)
        .map((d) => (d.details.sharedKey === key ? { ...d, details: { ...d.details, mapMode: "new", sharedKey: "" } } : d)),
    );

  const addDraft = () => setDrafts((ds) => [...ds, emptyDraft()]);

  const err = (path: string) => errors[path];

  const validate = () => {
    const errs: Record<string, string> = {};
    drafts.forEach((d, i) => {
      if (!d.department) errs[`requests.${i}.department`] = "Choose a department";
    });
    const payload = {
      ...about,
      requests: drafts.map((d, i) => ({
        department: d.department ?? "facilities",
        details: d.department ? toPayloadDetails(drafts, i) : {},
        comments: d.comments,
        attachments: [],
      })),
    };
    const parsed = submissionSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const p = issue.path.join(".");
        const idx = typeof issue.path[1] === "number" ? (issue.path[1] as number) : -1;
        if (idx >= 0 && !drafts[idx]?.department) continue;
        if (!errs[p]) errs[p] = issue.message;
      }
    }
    return { errs, data: parsed.success ? parsed.data : null };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { errs, data } = validate();
    setErrors(errs);
    if (Object.keys(errs).length || !data) {
      toast.error("A few things need your attention");
      requestAnimationFrame(() => document.querySelector("[aria-invalid='true'], .text-destructive")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setSubmitting(true);
    try {
      // Upload attachments first
      for (let i = 0; i < drafts.length; i++) {
        const files = drafts[i].files;
        if (!files.length) continue;
        const { slots } = await uploadFn({ data: { files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })) } });
        const uploaded = [];
        for (let j = 0; j < slots.length; j++) {
          const s = slots[j];
          const { error } = await supabase.storage.from("request-attachments").uploadToSignedUrl(s.path, s.token, files[j], { contentType: s.type });
          if (error) throw new Error(`Couldn't upload ${s.name}`);
          uploaded.push({ path: s.path, name: s.name, size: s.size, type: s.type });
        }
        data.requests[i].attachments = uploaded;
      }
      const res = await submitFn({ data });
      setDone({ ...res, departments: res.departments as Department[], eventName: data.eventName });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setAbout(emptyAbout);
    setDrafts([emptyDraft()]);
    setErrors({});
    setDone(null);
  };

  const requestCountLabel = useMemo(() => `${drafts.length} request${drafts.length === 1 ? "" : "s"}`, [drafts.length]);

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft sm:p-12">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Request received</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Thank you. Your request for <span className="font-semibold text-foreground">{done.eventName}</span> has been sent to the teams below.
          {done.merged && " It was added to the existing event so everything stays in one place."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {Array.from(new Set(done.departments)).map((d) => (
            <span key={d} className={cn("rounded-full border px-3 py-1 text-sm font-medium", DEPT[d].border, DEPT[d].softBg)}>
              {DEPT[d].label}
            </span>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Reference <span className="font-mono font-semibold text-foreground">#{done.reference}</span>
        </p>
        <button onClick={startOver} className="mt-8 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <SectionCard step="01" title="About you & your event">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" required error={err("requesterName")}>
            <TextInput autoComplete="name" placeholder="First and last name" value={about.requesterName} onChange={(e) => setA("requesterName", e.target.value)} invalid={!!err("requesterName")} />
          </Field>
          <Field label="Phone number" required error={err("phone")}>
            <TextInput type="tel" autoComplete="tel" placeholder="(555) 123-4567" value={about.phone} onChange={(e) => setA("phone", e.target.value)} invalid={!!err("phone")} />
          </Field>
          <Field label="Email" required hint="— so the team can reach you" error={err("email")} className="sm:col-span-2">
            <TextInput type="email" autoComplete="email" placeholder="you@email.com" value={about.email} onChange={(e) => setA("email", e.target.value)} invalid={!!err("email")} />
          </Field>
          <Field label="Event name" required error={err("eventName")} className="sm:col-span-2">
            <TextInput placeholder="What's the occasion?" value={about.eventName} onChange={(e) => setA("eventName", e.target.value)} invalid={!!err("eventName")} />
          </Field>
          <Field label="Event date" required error={err("eventDate")}>
            <TextInput type="date" value={about.eventDate} onChange={(e) => setA("eventDate", e.target.value)} invalid={!!err("eventDate")} />
          </Field>
          <Field label="Requesting team / ministry" required error={err("team")}>
            <TextInput placeholder="e.g. Youth ministry" value={about.team} onChange={(e) => setA("team", e.target.value)} invalid={!!err("team")} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard step="02" title="What do you need?" aside={<span className="hidden text-muted-foreground sm:inline">{requestCountLabel}</span>}>
        <div className="space-y-5">
          {drafts.map((d, i) => {
            const meta = d.department ? DEPT[d.department] : null;
            const setDetails = (patch: Record<string, any>) => updateDraft(d.key, (x) => ({ ...x, details: { ...x.details, ...patch } }));
            const e = (field: string) => err(`requests.${i}.details.${field}`);
            const sectionProps = { details: d.details, set: setDetails, err: e, idPrefix: d.key };
            const sources = isMapDept(d.department) ? mapSources(drafts, i) : [];
            return (
              <div key={d.key} className={cn("rounded-xl border bg-surface/60 p-4 transition-colors sm:p-6", meta ? meta.border : "border-border")}>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Request {String(i + 1).padStart(2, "0")}
                    {meta && <span className={cn("ml-2", meta.text)}>· {meta.label}</span>}
                  </span>
                  {drafts.length > 1 && (
                    <button type="button" onClick={() => removeDraft(d.key)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  )}
                </div>

                <Label required>Department</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {DEPARTMENTS.map((dep) => {
                    const m = DEPT[dep];
                    const Icon = m.icon;
                    const on = d.department === dep;
                    return (
                      <button
                        key={dep}
                        type="button"
                        aria-pressed={on}
                        onClick={() => chooseDept(d.key, dep)}
                        className={cn(
                          "group flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-all",
                          on ? cn(m.border, m.softBg) : "border-input bg-field hover:border-muted-foreground/50",
                        )}
                      >
                        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", on ? m.text : "text-muted-foreground group-hover:text-foreground")} />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold leading-tight">{m.label}</span>
                          <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{m.blurb}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {err(`requests.${i}.department`) && <p className="mt-1.5 text-sm text-destructive">{err(`requests.${i}.department`)}</p>}

                {d.department && (
                  <div className="mt-6 space-y-6 border-t border-border pt-6">
                    {d.department === "facilities" && <FacilitiesSection {...sectionProps} sources={sources} />}
                    {d.department === "it_network" && <ItNetworkSection {...sectionProps} sources={sources} />}
                    {d.department === "kitchen" && <KitchenSection {...sectionProps} />}
                    {d.department === "audio_video" && <AudioVideoSection {...sectionProps} />}
                    {d.department === "photo_video" && <PhotoVideoSection {...sectionProps} />}
                    {d.department === "parking" && <ParkingSection {...sectionProps} />}

                    <Field label="Comments" hint="Optional — anything else this team should know">
                      <TextArea value={d.comments} onChange={(ev) => updateDraft(d.key, (x) => ({ ...x, comments: ev.target.value }))} placeholder="Anything we might have missed?" maxLength={2000} />
                    </Field>
                    <AttachmentsField files={d.files} onChange={(files) => updateDraft(d.key, (x) => ({ ...x, files }))} />
                  </div>
                )}
              </div>
            );
          })}

          {drafts.length < 12 && (
            <button type="button" onClick={addDraft} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> Add another request for this event
            </button>
          )}
        </div>
      </SectionCard>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Sending…" : "Submit request"}
        </button>
        <p className="text-sm text-muted-foreground">Each team only receives the part of the form meant for them.</p>
      </div>
    </form>
  );
}
