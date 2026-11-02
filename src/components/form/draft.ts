import type { Department } from "@/lib/departments";
import { DEPT } from "@/lib/departments";

export type MapMode = "new" | "shared";

export type DraftRequest = {
  key: string;
  department: Department | null;
  details: Record<string, any>;
  comments: string;
  files: File[];
};

export function newKey() {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyDraft(): DraftRequest {
  return { key: newKey(), department: null, details: {}, comments: "", files: [] };
}

export function defaultDetails(dept: Department, eventDate: string): Record<string, any> {
  switch (dept) {
    case "facilities":
      return { mapMode: "new", sharedKey: "", rooms: [], startDate: eventDate, endDate: eventDate, startTime: "", endTime: "" };
    case "it_network":
      return {
        mapMode: "new",
        sharedKey: "",
        rooms: [],
        startDate: eventDate,
        endDate: eventDate,
        startTime: "",
        endTime: "",
        wifiNeeded: null,
        networks: [""],
      };
    case "kitchen":
      return {
        services: [{ date: eventDate, meals: [], people: "" }],
        volunteersEarly: null,
        volunteerArrival: "",
        volunteerCount: "",
        volunteersNeedFood: null,
        volunteerMeals: [],
        allergies: "",
      };
    case "audio_video":
      return { locations: [], items: [], quantities: {} };
    case "photo_video":
      return { items: {}, neededBy: "" };
    case "parking":
      return { date: eventDate, startTime: "", endTime: "", vehicles: "", needs: [] };
  }
}

export const isMapDept = (d: Department | null): d is "facilities" | "it_network" =>
  d === "facilities" || d === "it_network";

/** Earlier map requests this one can copy rooms from. */
export function mapSources(drafts: DraftRequest[], index: number) {
  return drafts
    .slice(0, index)
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => isMapDept(d.department) && d.details.mapMode === "new" && (d.details.rooms?.length ?? 0) > 0)
    .map(({ d, i }) => ({
      key: d.key,
      label: `Request ${String(i + 1).padStart(2, "0")} · ${DEPT[d.department!].label}`,
      rooms: d.details.rooms as string[],
    }));
}

export function resolveRooms(drafts: DraftRequest[], index: number): { rooms: string[]; sharedFrom: string } {
  const d = drafts[index];
  if (d.details.mapMode === "shared") {
    const src = mapSources(drafts, index).find((s) => s.key === d.details.sharedKey);
    if (src) return { rooms: src.rooms, sharedFrom: src.label };
    return { rooms: [], sharedFrom: "" };
  }
  return { rooms: d.details.rooms ?? [], sharedFrom: "" };
}

/** Turn the on-screen form into the shape the server expects. */
export function toPayloadDetails(drafts: DraftRequest[], index: number) {
  const d = drafts[index];
  const det = d.details;
  const num = (v: unknown) => (v === "" || v == null ? undefined : Number(v));
  switch (d.department) {
    case "facilities": {
      const { rooms, sharedFrom } = resolveRooms(drafts, index);
      return { rooms, sharedFrom, startDate: det.startDate, endDate: det.endDate, startTime: det.startTime, endTime: det.endTime };
    }
    case "it_network": {
      const { rooms, sharedFrom } = resolveRooms(drafts, index);
      return {
        rooms,
        sharedFrom,
        startDate: det.startDate,
        endDate: det.endDate,
        startTime: det.startTime,
        endTime: det.endTime,
        wifiNeeded: det.wifiNeeded,
        networks: det.wifiNeeded ? (det.networks as string[]).map((n) => n.trim()).filter(Boolean) : [],
      };
    }
    case "kitchen":
      return {
        services: (det.services as any[]).map((s) => ({ date: s.date, meals: s.meals, people: num(s.people) })),
        volunteersEarly: det.volunteersEarly,
        volunteerArrival: det.volunteersEarly ? det.volunteerArrival : "",
        volunteerCount: det.volunteersEarly ? num(det.volunteerCount) : 0,
        volunteersNeedFood: det.volunteersEarly ? det.volunteersNeedFood === true : false,
        volunteerMeals: det.volunteersEarly && det.volunteersNeedFood ? det.volunteerMeals : [],
        allergies: det.allergies,
      };
    case "audio_video": {
      const quantities: Record<string, number> = {};
      for (const [k, v] of Object.entries(det.quantities ?? {})) {
        if ((det.items as string[]).includes(k)) quantities[k] = Number(v) || 0;
      }
      return { locations: det.locations, items: det.items, quantities };
    }
    case "photo_video":
      return { items: det.items, neededBy: det.neededBy };
    case "parking":
      return { date: det.date, startTime: det.startTime, endTime: det.endTime, vehicles: num(det.vehicles), needs: det.needs };
    default:
      return {};
  }
}
