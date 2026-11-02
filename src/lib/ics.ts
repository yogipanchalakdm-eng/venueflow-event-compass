export type IcsEvent = {
  summary: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (inclusive)
  location?: string;
  description?: string;
};

function unfold(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function unescape(v: string) {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseIcsDate(raw: string): { day: string; allDay: boolean } | null {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return null;
  if (m[4] && m[8]) {
    // UTC timestamp — convert to Houston local day
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[5], +m[6], +m[7]));
    const local = d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    return { day: local, allDay: false };
  }
  return { day: `${m[1]}-${m[2]}-${m[3]}`, allDay: !m[4] };
}

function addDays(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Parse the events out of a .ics calendar file (Google, Outlook, Apple). */
export function parseIcs(text: string): IcsEvent[] {
  const lines = unfold(text).split("\n");
  const out: IcsEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) cur = {};
    else if (line.startsWith("END:VEVENT")) {
      if (cur?.DTSTART && cur.SUMMARY) {
        const s = parseIcsDate(cur.DTSTART);
        if (s) {
          let end = s.day;
          if (cur.DTEND) {
            const e = parseIcsDate(cur.DTEND);
            if (e) end = e.allDay ? addDays(e.day, -1) : e.day;
          }
          if (end < s.day) end = s.day;
          out.push({
            summary: unescape(cur.SUMMARY).trim(),
            start: s.day,
            end,
            location: cur.LOCATION ? unescape(cur.LOCATION) : undefined,
            description: cur.DESCRIPTION ? unescape(cur.DESCRIPTION).slice(0, 2000) : undefined,
          });
        }
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).split(";")[0].toUpperCase();
        if (!(key in cur)) cur[key] = line.slice(idx + 1);
      }
    }
  }
  return out;
}
