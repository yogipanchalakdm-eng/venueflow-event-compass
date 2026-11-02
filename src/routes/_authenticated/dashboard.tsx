import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarPlus, Inbox, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, DEPT, type Department } from "@/lib/departments";
import { eventsQuery, requestIndexQuery } from "@/lib/staff-data";
import { fmtRange, todayIso } from "@/lib/dates";
import { staffProfileQuery } from "@/hooks/use-staff";
import { StaffShell } from "@/components/staff/StaffShell";
import { DeptChip, StatusPill } from "@/components/staff/DeptChip";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · BAPS Houston Events" },
      { name: "description", content: "Upcoming events and department requests at BAPS Houston." },
      { property: "og:title", content: "Dashboard · BAPS Houston Events" },
      { property: "og:description", content: "Upcoming events and department requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(eventsQuery),
      context.queryClient.ensureQueryData(requestIndexQuery),
      context.queryClient.ensureQueryData(staffProfileQuery),
    ]),
  component: Dashboard,
});

type When = "upcoming" | "past" | "all";

function Dashboard() {
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: reqs } = useSuspenseQuery(requestIndexQuery);
  const { data: me } = useSuspenseQuery(staffProfileQuery);
  const isMaster = me?.role === "master";
  const [when, setWhen] = useState<When>("upcoming");
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState<Department | "all">("all");
  const today = todayIso();

  const reqsByEvent = useMemo(() => {
    const m = new Map<string, typeof reqs>();
    for (const r of reqs) m.set(r.event_id, [...(m.get(r.event_id) ?? []), r]);
    return m;
  }, [reqs]);

  const list = useMemo(() => {
    let l = events;
    if (when === "upcoming") l = l.filter((e) => e.end_date >= today);
    if (when === "past") l = l.filter((e) => e.end_date < today).reverse();
    if (deptFilter !== "all") l = l.filter((e) => (e.departments as Department[]).includes(deptFilter));
    if (q.trim()) l = l.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()));
    return l;
  }, [events, when, today, q, deptFilter]);

  const newCount = reqs.filter((r) => r.status === "new" && (deptFilter === "all" || r.department === deptFilter)).length;
  const upcomingCount = events.filter((e) => e.end_date >= today).length;

  return (
    <StaffShell
      title="Upcoming events"
      actions={
        <Link to="/calendar" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold hover:border-account">
          <CalendarPlus className="h-4 w-4" /> Calendar & import
        </Link>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Upcoming events" value={upcomingCount} />
        <Stat label={isMaster ? "New requests" : "New for your team"} value={newCount} accent />
        <Stat label="Total requests" value={reqs.length} className="hidden sm:block" />
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="inline-flex w-fit rounded-lg border border-border bg-card p-1">
          {(["upcoming", "past", "all"] as When[]).map((w) => (
            <button
              key={w}
              onClick={() => setWhen(w)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium capitalize", when === w ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-account"
          />
        </div>
        {isMaster && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:ml-auto lg:pb-0">
            <button
              onClick={() => setDeptFilter("all")}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-semibold", deptFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}
            >
              All teams
            </button>
            {DEPARTMENTS.map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
                  deptFilter === d ? cn(DEPT[d].bg, DEPT[d].border, "text-primary-foreground") : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {DEPT[d].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No {when === "all" ? "" : when} events yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Events appear here as soon as someone sends a request{isMaster ? "" : " for your team"}, or when a calendar is imported.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => {
            const evReqs = reqsByEvent.get(e.id) ?? [];
            const mine = me?.department ? evReqs.filter((r) => r.department === me.department) : evReqs;
            const newOnes = mine.filter((r) => r.status === "new").length;
            const start = parseISO(e.start_date);
            return (
              <Link
                key={e.id}
                to="/events/$eventId"
                params={{ eventId: e.id }}
                className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-account"
              >
                <div className="flex items-start gap-4">
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-border bg-surface py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-account">{format(start, "MMM")}</span>
                    <span className="font-display text-2xl font-bold leading-none">{format(start, "d")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold group-hover:text-account">{e.name}</h3>
                    <p className="text-sm text-muted-foreground">{fmtRange(e.start_date, e.end_date)}</p>
                  </div>
                  {newOnes > 0 && <StatusPill status="new" />}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(e.departments as Department[]).length ? (
                    (e.departments as Department[]).map((d) => <DeptChip key={d} dept={d} highlight={d === me?.department} />)
                  ) : (
                    <span className="text-xs text-muted-foreground">No requests yet</span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    {mine.length} {isMaster ? "request" : "request for your team"}
                    {mine.length === 1 ? "" : "s"}
                  </span>
                  {e.source === "import" && <span className="rounded-full bg-secondary px-2 py-0.5">From calendar</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </StaffShell>
  );
}

function Stat({ label, value, accent, className }: { label: string; value: number; accent?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card px-4 py-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-display text-2xl font-bold", accent && "text-account")}>{value}</p>
    </div>
  );
}
