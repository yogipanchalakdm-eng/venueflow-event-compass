import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEPT, type Department } from "@/lib/departments";
import { eventsQuery, type EventRow } from "@/lib/staff-data";
import { fmtRange, todayIso } from "@/lib/dates";
import { parseIcs } from "@/lib/ics";
import { importCalendarEvents } from "@/lib/requests.functions";
import { staffProfileQuery } from "@/hooks/use-staff";
import { StaffShell } from "@/components/staff/StaffShell";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar · BAPS Houston Events" },
      { name: "description", content: "Month view of every event at BAPS Houston, with calendar import." },
      { property: "og:title", content: "Calendar · BAPS Houston Events" },
      { property: "og:description", content: "Every event at BAPS Houston on one calendar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(eventsQuery), context.queryClient.ensureQueryData(staffProfileQuery)]),
  component: CalendarPage,
});

function eventDot(e: EventRow) {
  const d = (e.departments as Department[])[0];
  return d ? DEPT[d].bg : "bg-muted-foreground";
}

function CalendarPage() {
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: me } = useSuspenseQuery(staffProfileQuery);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importFn = useServerFn(importCalendarEvents);
  const qc = useQueryClient();
  const today = todayIso();

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
    [month],
  );

  const eventsOn = (iso: string) => events.filter((e) => e.start_date <= iso && e.end_date >= iso);
  const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");
  const monthEvents = events.filter((e) => e.start_date <= monthEnd && e.end_date >= monthStart);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const parsed = parseIcs(await file.text());
      if (!parsed.length) {
        toast.error("No events found in that file");
        return;
      }
      const res = await importFn({ data: { events: parsed.slice(0, 500) } });
      toast.success(`Imported ${res.added} event${res.added === 1 ? "" : "s"}${res.synced ? ` · ${res.synced} already on the calendar` : ""}`);
      await qc.invalidateQueries({ queryKey: ["events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <StaffShell
      title="Calendar"
      actions={
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-70"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import calendar (.ics)
          </button>
          <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </>
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="rounded-lg border border-border bg-card p-2 hover:border-account" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-lg border border-border bg-card p-2 hover:border-account" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setMonth(startOfMonth(new Date()))} className="ml-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:border-account">
            Today
          </button>
        </div>
        <h2 className="font-display text-xl font-semibold">{format(month, "MMMM yyyy")}</h2>
      </div>

      {/* Desktop month grid */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <div className="grid grid-cols-7 border-b border-border bg-surface/60">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const evs = eventsOn(iso);
            return (
              <div key={iso} className={cn("min-h-[112px] border-b border-r border-border p-1.5", !isSameMonth(day, month) && "bg-background/40")}>
                <div
                  className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    iso === today ? "bg-account font-bold text-primary-foreground" : isSameMonth(day, month) ? "text-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {evs.slice(0, 3).map((e) => (
                    <Link
                      key={e.id}
                      to="/events/$eventId"
                      params={{ eventId: e.id }}
                      title={e.name}
                      className="flex items-center gap-1.5 truncate rounded-md bg-surface px-1.5 py-1 text-xs font-medium hover:bg-secondary"
                    >
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", eventDot(e))} />
                      <span className="truncate">{e.name}</span>
                    </Link>
                  ))}
                  {evs.length > 3 && <p className="px-1.5 text-[11px] text-muted-foreground">+{evs.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile agenda */}
      <div className="space-y-2 md:hidden">
        {monthEvents.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No events this month.</p>}
        {monthEvents.map((e) => (
          <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className={cn("h-10 w-1.5 shrink-0 rounded-full", eventDot(e))} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{e.name}</span>
              <span className="block text-xs text-muted-foreground">{fmtRange(e.start_date, e.end_date)}</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Export an .ics file from Google Calendar, Outlook or Apple Calendar and import it here. Events with the same name and dates as existing ones are
        matched instead of duplicated.{me?.role !== "master" && " You see events for your team plus imported calendar events."}
      </p>
    </StaffShell>
  );
}
