import { format, parseISO } from "date-fns";

export const fmtDate = (d?: string | null, pattern = "MMM d, yyyy") => (d ? format(parseISO(d), pattern) : "—");

export function fmtRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  if (!end || end === start) return format(parseISO(start), "EEE, MMM d, yyyy");
  const s = parseISO(start);
  const e = parseISO(end);
  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) return `${format(s, "MMM d")} – ${format(e, "d, yyyy")}`;
    return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
  }
  return `${format(s, "MMM d, yyyy")} – ${format(e, "MMM d, yyyy")}`;
}

export function fmtTime(t?: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const todayIso = () => format(new Date(), "yyyy-MM-dd");
