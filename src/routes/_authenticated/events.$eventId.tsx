import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Download, GitMerge, Mail, Paperclip, Phone, Printer, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, DEPT, STATUS_OPTIONS, type Department } from "@/lib/departments";
import { eventDetailQuery, eventsQuery, type RequestRow } from "@/lib/staff-data";
import { fmtDate, fmtRange } from "@/lib/dates";
import { staffProfileQuery } from "@/hooks/use-staff";
import { StaffShell } from "@/components/staff/StaffShell";
import { DeptChip, StatusPill } from "@/components/staff/DeptChip";
import { RequestDetails } from "@/components/staff/RequestDetails";
import { formatBytes } from "@/components/form/AttachmentsField";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event sheet · BAPS Houston Events" },
      { name: "description", content: "Full logistics sheet for an event at BAPS Houston." },
      { property: "og:title", content: "Event sheet · BAPS Houston Events" },
      { property: "og:description", content: "All department requests for one event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(eventDetailQuery(params.eventId)),
      context.queryClient.ensureQueryData(staffProfileQuery),
    ]),
  component: EventPage,
});

function Attachments({ files }: { files: { path: string; name: string; size: number }[] }) {
  if (!files?.length) return null;
  const open = async (path: string) => {
    const { data, error } = await supabase.storage.from("request-attachments").createSignedUrl(path, 300);
    if (error || !data) return void toast.error("Couldn't open that file");
    window.open(data.signedUrl, "_blank", "noopener");
  };
  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Paperclip className="h-4 w-4" /> Attachments
      </p>
      <div className="flex flex-wrap gap-2">
        {files.map((f) => (
          <button key={f.path} onClick={() => open(f.path)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:border-account">
            <Download className="h-3.5 w-3.5" /> {f.name} <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RequestCard({ r, requester, canEdit, onChanged }: { r: RequestRow; requester?: { name: string; team: string }; canEdit: boolean; onChanged: () => void }) {
  const m = DEPT[r.department as Department];
  const [notes, setNotes] = useState(r.internal_notes ?? "");
  const [saving, setSaving] = useState(false);

  const update = async (patch: { status?: string; internal_notes?: string }) => {
    setSaving(true);
    const { error } = await supabase.from("requests").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", r.id);
    setSaving(false);
    if (error) return void toast.error("Couldn't save");
    toast.success("Saved");
    onChanged();
  };

  return (
    <article className={cn("break-inside-avoid rounded-2xl border bg-card p-5 sm:p-6", m.border)}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", m.softBg)}>
          <m.icon className={cn("h-5 w-5", m.text)} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{m.label}</h3>
          {requester && (
            <p className="text-xs text-muted-foreground">
              From {requester.name} · {requester.team} · {fmtDate(r.created_at.slice(0, 10))}
            </p>
          )}
        </div>
        {canEdit ? (
          <select
            value={r.status}
            disabled={saving}
            onChange={(e) => update({ status: e.target.value })}
            className="no-print rounded-lg border border-input bg-field px-3 py-1.5 text-sm font-medium outline-none focus:border-account"
            aria-label="Status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        ) : (
          <StatusPill status={r.status} />
        )}
      </header>

      <RequestDetails department={r.department as Department} details={r.details as Record<string, any>} />

      {r.comments && (
        <div className="mt-4 rounded-lg border border-border bg-surface/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requester comments</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{r.comments}</p>
        </div>
      )}

      <Attachments files={(r.attachments as any[]) ?? []} />

      {canEdit && (
        <div className="no-print mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team notes (internal)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (r.internal_notes ?? "") && update({ internal_notes: notes })}
            placeholder="Only staff see this"
            className="mt-1 min-h-[64px] w-full rounded-lg border border-input bg-field px-3 py-2 text-sm outline-none focus:border-account"
          />
        </div>
      )}
    </article>
  );
}

function MergeDialog({ open, onOpenChange, eventId }: { open: boolean; onOpenChange: (o: boolean) => void; eventId: string }) {
  const { data: events } = useSuspenseQuery(eventsQuery);
  const [target, setTarget] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const others = events.filter((e) => e.id !== eventId);
  const merge = async () => {
    if (!target) return;
    const { error } = await supabase.rpc("merge_events", { _from: eventId, _into: target });
    if (error) return void toast.error(error.message);
    toast.success("Events merged");
    await qc.invalidateQueries();
    onOpenChange(false);
    navigate({ to: "/events/$eventId", params: { eventId: target } });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge into another event</DialogTitle>
          <DialogDescription>All requests on this card move to the event you pick, and this card is removed.</DialogDescription>
        </DialogHeader>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-lg border border-input bg-field px-3 py-2.5 text-sm">
          <option value="">Choose an event…</option>
          {others.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} — {fmtRange(e.start_date, e.end_date)}
            </option>
          ))}
        </select>
        <button onClick={merge} disabled={!target} className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
          Merge events
        </button>
      </DialogContent>
    </Dialog>
  );
}

function EventPage() {
  const { eventId } = Route.useParams();
  const { data } = useSuspenseQuery(eventDetailQuery(eventId));
  const { data: me } = useSuspenseQuery(staffProfileQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [mergeOpen, setMergeOpen] = useState(false);
  const isMaster = me?.role === "master";
  const { event, submissions, requests } = data;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["event", eventId] });
    qc.invalidateQueries({ queryKey: ["request-index"] });
  };

  if (!event) {
    return (
      <StaffShell title="Event not found">
        <p className="text-muted-foreground">This event doesn't exist or isn't shared with your team.</p>
        <Link to="/dashboard" className="mt-4 inline-block font-semibold text-account">
          Back to dashboard
        </Link>
      </StaffShell>
    );
  }

  const subById = new Map(submissions.map((s) => [s.id, s]));
  const departments = event.departments as Department[];
  const ordered = [...requests].sort((a, b) => DEPARTMENTS.indexOf(a.department as Department) - DEPARTMENTS.indexOf(b.department as Department));
  const hiddenDepts = departments.filter((d) => !requests.some((r) => r.department === d));

  const deleteEvent = async () => {
    if (!confirm(`Delete "${event.name}" and all of its requests? This can't be undone.`)) return;
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) return void toast.error(error.message);
    toast.success("Event deleted");
    await qc.invalidateQueries();
    navigate({ to: "/dashboard" });
  };

  return (
    <StaffShell
      title={event.name}
      actions={
        <div className="no-print flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:border-account">
            <Printer className="h-4 w-4" /> Print
          </button>
          {isMaster && (
            <>
              <button onClick={() => setMergeOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:border-account">
                <GitMerge className="h-4 w-4" /> Merge
              </button>
              <button onClick={deleteEvent} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-destructive hover:border-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </>
          )}
        </div>
      }
    >
      <Link to="/dashboard" className="no-print mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="order-2 space-y-4 lg:order-1">
          {ordered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
              {event.source === "import" ? "This event came from an imported calendar and has no requests yet." : "No requests for your team on this event."}
            </div>
          ) : (
            ordered.map((r) => {
              const s = subById.get(r.submission_id);
              return (
                <RequestCard
                  key={r.id}
                  r={r}
                  requester={s ? { name: s.requester_name, team: s.team } : undefined}
                  canEdit={isMaster || r.department === me?.department}
                  onChanged={refresh}
                />
              );
            })
          )}
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">When</p>
            <p className="mt-1 font-display text-lg font-semibold">{fmtRange(event.start_date, event.end_date)}</p>
            {event.location && <p className="mt-1 text-sm text-muted-foreground">{event.location}</p>}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teams involved</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {departments.length ? departments.map((d) => <DeptChip key={d} dept={d} highlight={d === me?.department} />) : <span className="text-sm text-muted-foreground">None yet</span>}
            </div>
            {!isMaster && hiddenDepts.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">You see your team's part. Other teams handle their own sections.</p>
            )}
            {event.description && <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>}
          </div>

          {submissions.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Requested by
              </p>
              <ul className="space-y-4">
                {submissions.map((s) => (
                  <li key={s.id} className="text-sm">
                    <p className="font-semibold">{s.requester_name}</p>
                    <p className="text-muted-foreground">{s.team}</p>
                    <div className="mt-1.5 flex flex-col gap-1">
                      <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1.5 text-account hover:underline">
                        <Phone className="h-3.5 w-3.5" /> {s.phone}
                      </a>
                      <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 break-all text-account hover:underline">
                        <Mail className="h-3.5 w-3.5" /> {s.email}
                      </a>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sent {fmtDate(s.created_at.slice(0, 10))}
                      {s.event_name !== event.name && <> · entered as "{s.event_name}"</>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      {isMaster && <MergeDialog open={mergeOpen} onOpenChange={setMergeOpen} eventId={event.id} />}
    </StaffShell>
  );
}
