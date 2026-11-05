import type { Department } from "./departments";
import { AV_ALL, DESIGN_ITEMS, MEAL_LABEL, MEDIA_ITEMS, PARKING_NEEDS } from "./request-schema";

const PV_LABEL: Record<string, string> = Object.fromEntries([...DESIGN_ITEMS, ...MEDIA_ITEMS].map((i) => [i.id, i.label]));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Short chips and a key date for a request card, per department. */
export function cardSummary(department: Department, raw: unknown): { chips: string[]; date?: string; dateLabel: string } {
  const d = (raw ?? {}) as Record<string, any>;
  switch (department) {
    case "facilities":
    case "it_network": {
      const chips: string[] = [];
      if (d.sharedFrom) chips.push(`Rooms as ${d.sharedFrom}`);
      else if (d.rooms?.length) chips.push(plural(d.rooms.length, "room"));
      if (department === "it_network" && d.wifiNeeded) chips.push("Wi-Fi");
      return { chips, date: d.startDate, dateLabel: "Starts" };
    }
    case "kitchen": {
      const services: { date: string; meals?: string[]; people?: number }[] = d.services ?? [];
      const meals = new Set(services.flatMap((s) => s.meals ?? []));
      const peak = Math.max(0, ...services.map((s) => Number(s.people) || 0));
      const chips = [...meals].map((m) => MEAL_LABEL[m as keyof typeof MEAL_LABEL] ?? m);
      if (peak) chips.push(`${peak} people`);
      if (d.allergies) chips.push("Allergies");
      return { chips, date: services[0]?.date, dateLabel: "First meal" };
    }
    case "audio_video": {
      const chips = (d.items ?? []).map((id: string) => AV_ALL.find((x) => x.id === id)?.label ?? id);
      return { chips, dateLabel: "Event" };
    }
    case "photo_video":
      return { chips: Object.keys(d.items ?? {}).map((k) => PV_LABEL[k] ?? k), date: d.neededBy, dateLabel: "Due" };
    case "parking": {
      const chips: string[] = d.vehicles ? [`${d.vehicles} vehicles`] : [];
      for (const n of d.needs ?? []) chips.push(PARKING_NEEDS.find((p) => p.id === n)?.label ?? n);
      return { chips, date: d.date, dateLabel: "On" };
    }
    default:
      return { chips: [], dateLabel: "Event" };
  }
}
