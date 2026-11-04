import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarClock, ExternalLink, Mail, Paperclip, Phone, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { DEPT, STATUS_OPTIONS, type Department } from "@/lib/departments";
import { DESIGN_ITEMS, MEDIA_ITEMS } from "@/lib/request-schema";
import { boardQuery, teamQuery, type BoardRequest, type TeamMember } from "@/lib/staff-data";
import { BOARD_DEPARTMENTS, hasRequestBoard } from "@/lib/team";
import { fmtDate, fmtRange } from "@/lib/dates";
import { staffProfileQuery } from "@/hooks/use-staff";
import { StaffShell } from "@/components/staff/StaffShell";
import { StatusPill } from "@/components/staff/DeptChip";
import { RequestDetails } from "@/components/staff/RequestDetails";
import { Attachments } from "@/components/staff/Attachments";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BOARD_DEPT: Department = BOARD_DEPARTMENTS[0];

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({
    meta: [
      { title: "Request Management · BAPS Houston Events" },
      { name: "description", content: "Card board for tracking and assigning Photo / Video requests at BAPS Houston." },
      { property: "og:title", content: "Request Management · BAPS Houston Events" },
      { property: "og:description", content: "Track and assign Photo / Video requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(staffProfileQuery),
      context.queryClient.ensureQueryData(boardQuery(BOARD_DEPT)),
      context.queryClient.ensureQueryData(teamQuery(BOARD_DEPT)),
    ]),
  component: BoardPage,
});

const ITEM_LABEL: Record<string, string> = Object.fromEntries([...DESIGN_ITEMS, ...MEDIA_ITEMS].map((i) => [i.id, i.label]));

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

function Avatar({ name, className }: { name?: string; className?: string }) {
  if (!name)
    return (
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground", className)}>
        <UserRound className="h-3.5 w-3.5" />
      </span>
    );
  return (
    <span title={name} className={cn("flex h-7 w-7 items-center justify-center rounded-full bg-account text-[11px] font-bold text-primary-foreground", className)}>
      {initials(name)}
    </span>
  );
}

type Filter = "all" | "mine" | "unassigned";

function BoardPage() {
  const { data: me } = useSuspenseQuery(staffProfileQuery);
  const { data: requests } = useSuspenseQuery(boardQuery(BOARD_DEPT));
  const { data: team } = useSuspenseQuery(teamQuery(BOARD_DEPT));
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const members = team.filter((t) => t.role === "member");
  const nameOf = useMemo(() => new Map(team.map((t) => [t.user_id, t.display_name])), [team]);

  const visible = useMemo(() => {
    let l = requests;
    if (filter === "mine") l = l.filter((r) => r.assigned_to === me?.userId);
    if (filter === "unassigned") l = l.filter((r) => !r.assigned_to);
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((r) => [r.event?.name, r.submission?.requester_name, r.submission?.team].some((v) => v?.toLowerCase().includes(s)));
    return l;
  }, [requests, filter, q, me?.userId]);

  if (!hasRequestBoard(me)) {
    return (
      <StaffShell title="Request Management">
        <p className="text-muted-foreground">This board is for the {DEPT[BOARD_DEPT].label} team.</p>
        <Link to="/dashboard" className="mt-3 inline-block font-semibold text-account">
          Back to dashboard
        </Link>
      </StaffShell>
    );
  }

  const update = async (id: string, patch: { status?: string; assigned_to?: string | null; internal_notes?: string }) => {
    const key = boardQuery(BOARD_DEPT).queryKey;
    const prev = qc.getQueryData(key);
    qc.setQueryData(key, (old) => old?.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from("requests").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      qc.setQueryData(key, prev);
      toast.error("Couldn't save that change");
      return false;
    }
    qc.invalidateQueries({ queryKey: ["request-index"] });
    qc.invalidateQueries({ queryKey: ["event"] });
    return true;
  };

  const open = requests.find((r) => r.id === openId) ?? null;

  return (
    <StaffShell title="Request Management">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex w-fit rounded-lg border border-border bg-card p-1">
          {(
            [
              ["all", "All"],
              ["mine", "Assigned to me"],
              ["unassigned", "Unassigned"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", filter === v ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search event or requester"
            className="w-full rounded-lg border border-input bg-field py-2 pl-9 pr-3 text-sm outline-none focus:border-account"
          />
        </label>
        <p className="text-xs text-muted-foreground sm:ml-auto">Drag cards between columns, or tap a card to update it.</p>
      </div>

      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {STATUS_OPTIONS.map((col) => {
          const cards = visible.filter((r) => r.status === col.value);
          return (
            <section
              key={col.value}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.value);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.value ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                const id = dragId ?? e.dataTransfer.getData("text/plain");
                const card = requests.find((r) => r.id === id);
                if (card && card.status !== col.value) update(card.id, { status: col.value });
                setDragId(null);
              }}
              className={cn(
                "flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl border bg-surface/60 p-3 transition-colors sm:w-[260px] xl:w-auto xl:min-w-[200px] xl:max-w-none xl:flex-1",
                overCol === col.value ? "border-account bg-account/5" : "border-border",
              )}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <StatusPill status={col.value} />
                <span className="text-xs font-semibold text-muted-foreground">{cards.length}</span>
              </header>
              <div className="flex min-h-[120px] flex-col gap-2.5">
                {cards.map((r) => (
                  <BoardCard
                    key={r.id}
                    r={r}
                    assignee={r.assigned_to ? nameOf.get(r.assigned_to) : undefined}
                    dragging={dragId === r.id}
                    onOpen={() => setOpenId(r.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", r.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(r.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                  />
                ))}
                {cards.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No cards</p>}
              </div>
            </section>
          );
        })}
      </div>

      {requests.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">New {DEPT[BOARD_DEPT].label} requests from the form show up here as cards.</p>
      )}

      <CardDialog r={open} members={members} nameOf={nameOf} onClose={() => setOpenId(null)} onUpdate={update} />
    </StaffShell>
  );
}

function BoardCard({
  r,
  assignee,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  r: BoardRequest;
  assignee?: string;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const d = (r.details ?? {}) as { items?: Record<string, string>; neededBy?: string };
  const items = Object.keys(d.items ?? {}).map((k) => ITEM_LABEL[k] ?? k);
  const files = ((r.attachments as unknown[]) ?? []).length;
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "w-full cursor-grab rounded-xl border border-border bg-card p-3 text-left shadow-soft transition-all hover:border-account active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <p className="font-semibold leading-snug">{r.event?.name ?? "Event"}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {r.submission?.requester_name} · {r.submission?.team}
      </p>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {items.map((i) => (
            <span key={i} className="rounded-md bg-account/15 px-1.5 py-0.5 text-[11px] font-medium text-account">
              {i}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {d.neededBy ? (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" /> Due {fmtDate(d.neededBy, "MMM d")}
          </span>
        ) : r.event ? (
          <span>{fmtDate(r.event.start_date, "MMM d")}</span>
        ) : null}
        {files > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" /> {files}
          </span>
        )}
        <Avatar name={assignee} className="ml-auto" />
      </div>
    </button>
  );
}

function CardDialog({
  r,
  members,
  nameOf,
  onClose,
  onUpdate,
}: {
  r: BoardRequest | null;
  members: TeamMember[];
  nameOf: Map<string, string>;
  onClose: () => void;
  onUpdate: (id: string, patch: { status?: string; assigned_to?: string | null; internal_notes?: string }) => Promise<boolean>;
}) {
  return (
    <Dialog open={!!r} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {r && <CardDetails key={r.id} r={r} members={members} nameOf={nameOf} onUpdate={onUpdate} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CardDetails({
  r,
  members,
  nameOf,
  onUpdate,
  onClose,
}: {
  r: BoardRequest;
  members: TeamMember[];
  nameOf: Map<string, string>;
  onUpdate: (id: string, patch: { status?: string; assigned_to?: string | null; internal_notes?: string }) => Promise<boolean>;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(r.internal_notes ?? "");
  const s = r.submission;
  const selectClass = "w-full rounded-lg border border-input bg-field px-3 py-2 text-sm font-medium outline-none focus:border-account";
  const assignedMissing = r.assigned_to && !members.some((m) => m.user_id === r.assigned_to);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6 text-xl">{r.event?.name ?? "Request"}</DialogTitle>
        <DialogDescription>
          {r.event ? fmtRange(r.event.start_date, r.event.end_date) : ""}
          {r.event?.location ? ` · ${r.event.location}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
          <select
            value={r.status}
            onChange={async (e) => (await onUpdate(r.id, { status: e.target.value })) && toast.success("Status updated")}
            className={selectClass}
            aria-label="Status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned to</span>
          <select
            value={r.assigned_to ?? ""}
            onChange={async (e) => {
              const v = e.target.value || null;
              if (await onUpdate(r.id, { assigned_to: v })) toast.success(v ? `Assigned to ${nameOf.get(v) ?? "team member"}` : "Unassigned");
            }}
            className={selectClass}
            aria-label="Assigned to"
          >
            <option value="">Unassigned</option>
            {assignedMissing && <option value={r.assigned_to!}>{nameOf.get(r.assigned_to!) ?? "Former member"}</option>}
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name}
              </option>
            ))}
          </select>
          {members.length === 0 && <span className="mt-1 block text-xs text-muted-foreground">Add team members from the Team page to assign cards.</span>}
        </label>
      </div>

      {s && (
        <div className="rounded-xl border border-border bg-surface/60 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requested by</p>
          <p className="mt-1 font-semibold">
            {s.requester_name} <span className="font-normal text-muted-foreground">· {s.team}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1.5 text-account hover:underline">
              <Phone className="h-3.5 w-3.5" /> {s.phone}
            </a>
            <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 break-all text-account hover:underline">
              <Mail className="h-3.5 w-3.5" /> {s.email}
            </a>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Sent {fmtDate(r.created_at.slice(0, 10))}</p>
        </div>
      )}

      <RequestDetails department={r.department as Department} details={r.details as Record<string, any>} />

      {r.comments && (
        <div className="rounded-lg border border-border bg-surface/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requester comments</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{r.comments}</p>
        </div>
      )}

      <Attachments files={(r.attachments as any[]) ?? []} />

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team notes (internal)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={async () => notes !== (r.internal_notes ?? "") && (await onUpdate(r.id, { internal_notes: notes })) && toast.success("Notes saved")}
          placeholder="Only staff see this"
          className="mt-1 min-h-[72px] w-full rounded-lg border border-input bg-field px-3 py-2 text-sm outline-none focus:border-account"
        />
      </div>

      {r.event && (
        <Link
          to="/events/$eventId"
          params={{ eventId: r.event.id }}
          onClick={onClose}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-account hover:underline"
        >
          <ExternalLink className="h-4 w-4" /> Open full event sheet
        </Link>
      )}
    </>
  );
}
