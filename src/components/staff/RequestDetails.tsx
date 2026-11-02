import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Department } from "@/lib/departments";
import { AV_ALL, DESIGN_ITEMS, MEAL_LABEL, MEDIA_ITEMS, PARKING_NEEDS } from "@/lib/request-schema";
import { fmtDate, fmtTime } from "@/lib/dates";
import { VenueMap } from "@/components/form/VenueMap";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function Pills({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs">
          {i}
        </span>
      ))}
    </span>
  );
}

const meals = (m: string[] = []) => m.map((x) => MEAL_LABEL[x as keyof typeof MEAL_LABEL] ?? x);

export function RequestDetails({ department, details }: { department: Department; details: Record<string, any> }) {
  const d = details ?? {};
  switch (department) {
    case "facilities":
    case "it_network":
      return (
        <div className="space-y-4">
          <dl className="divide-y divide-border">
            <Row label="Dates">
              {fmtDate(d.startDate)} → {fmtDate(d.endDate)}
            </Row>
            <Row label={department === "facilities" ? "AC / heating on" : "Doors unlocked"}>
              {fmtTime(d.startTime)} – {fmtTime(d.endTime)}
            </Row>
            {d.sharedFrom && <Row label="Rooms">Same as {d.sharedFrom}</Row>}
            {department === "it_network" && (
              <Row label="Dedicated Wi-Fi">{d.wifiNeeded ? <Pills items={d.networks ?? []} /> : "Not needed"}</Row>
            )}
          </dl>
          <VenueMap value={d.rooms ?? []} department={department} readOnly compact />
        </div>
      );
    case "kitchen":
      return (
        <dl className="divide-y divide-border">
          <Row label="Meals">
            <ul className="space-y-1.5">
              {(d.services ?? []).map((s: any, i: number) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{fmtDate(s.date, "EEE, MMM d")}</span>
                  <Pills items={meals(s.meals)} />
                  <span className="text-muted-foreground">· {s.people} people</span>
                </li>
              ))}
            </ul>
          </Row>
          <Row label="Early volunteers">
            {d.volunteersEarly ? (
              <span>
                {d.volunteerCount} arriving {fmtDate(d.volunteerArrival, "EEE, MMM d")}
                {d.volunteersNeedFood ? (
                  <span className="mt-1 flex items-center gap-2">
                    Needs food: <Pills items={meals(d.volunteerMeals)} />
                  </span>
                ) : (
                  <span className="block text-muted-foreground">No food needed</span>
                )}
              </span>
            ) : (
              "No"
            )}
          </Row>
          <Row label="Allergies">{d.allergies || <span className="text-muted-foreground">None listed</span>}</Row>
        </dl>
      );
    case "audio_video": {
      const items: string[] = d.items ?? [];
      const label = (id: string) => {
        const it = AV_ALL.find((x) => x.id === id);
        const q = d.quantities?.[id];
        return it ? (it.qty && q ? `${it.label} × ${q}` : it.label) : id;
      };
      const groupOf = (ids: readonly { id: string }[]) => items.filter((i) => ids.some((x) => x.id === i)).map(label);
      return (
        <dl className="divide-y divide-border">
          <Row label="Locations">
            <Pills items={d.locations ?? []} />
          </Row>
          <Row label="Audio">
            <Pills items={groupOf(AV_ALL.slice(0, 4))} />
          </Row>
          <Row label="Video">
            <Pills items={groupOf(AV_ALL.slice(4, 8))} />
          </Row>
          <Row label="Misc">
            <Pills items={groupOf(AV_ALL.slice(8))} />
          </Row>
        </dl>
      );
    }
    case "photo_video": {
      const items: Record<string, string> = d.items ?? {};
      const all = [...DESIGN_ITEMS.map((x) => ({ ...x, g: "Design studio" })), ...MEDIA_ITEMS.map((x) => ({ ...x, g: "Photo / Video" }))];
      return (
        <dl className="divide-y divide-border">
          {all
            .filter((x) => x.id in items)
            .map((x) => (
              <Row key={x.id} label={`${x.g} · ${x.label}`}>
                <span className="whitespace-pre-wrap font-normal">{items[x.id]}</span>
              </Row>
            ))}
          {d.neededBy && <Row label="Needed by">{fmtDate(d.neededBy)}</Row>}
        </dl>
      );
    }
    case "parking":
      return (
        <dl className="divide-y divide-border">
          <Row label="Date">{fmtDate(d.date, "EEE, MMM d, yyyy")}</Row>
          <Row label="Time">
            {fmtTime(d.startTime)} – {fmtTime(d.endTime)}
          </Row>
          <Row label="Expected vehicles">{d.vehicles}</Row>
          <Row label="Needs">
            <Pills items={(d.needs ?? []).map((n: string) => PARKING_NEEDS.find((p) => p.id === n)?.label ?? n)} />
          </Row>
        </dl>
      );
    default:
      return <pre className={cn("text-xs")}>{JSON.stringify(d, null, 2)}</pre>;
  }
}
