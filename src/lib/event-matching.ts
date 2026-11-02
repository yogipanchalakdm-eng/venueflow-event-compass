/**
 * Rules for grouping many request forms into one event card.
 * Two submissions belong to the same event when their names match after
 * normalising (case, punctuation, spacing, a trailing year) and the new date
 * falls within the event's existing date range, give or take a few days.
 */
export const MATCH_WINDOW_DAYS = 3;

export function normalizeEventName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\bthe\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toDay(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

export type EventCandidate = { id: string; normalized_name: string; start_date: string; end_date: string };

export function isSameEvent(
  candidate: EventCandidate,
  name: string,
  range: { start: string; end: string },
  windowDays = MATCH_WINDOW_DAYS,
): boolean {
  if (candidate.normalized_name !== normalizeEventName(name)) return false;
  const cStart = toDay(candidate.start_date) - windowDays;
  const cEnd = toDay(candidate.end_date) + windowDays;
  return toDay(range.start) <= cEnd && toDay(range.end) >= cStart;
}

export function findMatchingEvent<T extends EventCandidate>(
  candidates: T[],
  name: string,
  range: { start: string; end: string },
): T | undefined {
  return candidates.find((c) => isSameEvent(c, name, range));
}

type DatedRequest = { department: string; details: Record<string, unknown> };

/** The dates a single department request covers, used for the event's range. */
export function requestDateRange(req: DatedRequest): { start: string | null; end: string | null } {
  const d = req.details as Record<string, any>;
  const dates: string[] = [];
  switch (req.department) {
    case "facilities":
    case "it_network":
      if (d.startDate) dates.push(d.startDate);
      if (d.endDate) dates.push(d.endDate);
      break;
    case "kitchen":
      for (const s of d.services ?? []) if (s?.date) dates.push(s.date);
      if (d.volunteersEarly && d.volunteerArrival) dates.push(d.volunteerArrival);
      break;
    case "parking":
      if (d.date) dates.push(d.date);
      break;
    default:
      break;
  }
  const valid = dates.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
  return { start: valid[0] ?? null, end: valid[valid.length - 1] ?? null };
}

/** Overall range of a submission: the event date plus every request's dates. */
export function submissionDateRange(eventDate: string, requests: DatedRequest[]) {
  const all = [eventDate];
  for (const r of requests) {
    const { start, end } = requestDateRange(r);
    if (start) all.push(start);
    if (end) all.push(end);
  }
  all.sort();
  return { start: all[0], end: all[all.length - 1] };
}
