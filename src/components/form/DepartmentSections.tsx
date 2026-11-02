import { Plus, Trash2, Copy, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPT, type Department } from "@/lib/departments";
import {
  AV_AUDIO,
  AV_LOCATIONS,
  AV_MISC,
  AV_VIDEO,
  DESIGN_ITEMS,
  MEALS,
  MEAL_LABEL,
  MEDIA_ITEMS,
  PARKING_NEEDS,
} from "@/lib/request-schema";
import { CheckChip, ErrorText, Field, SubHeading, TextArea, TextInput, YesNo, inputClass } from "./fields";
import { VenueMap } from "./VenueMap";

export type SectionProps = {
  details: Record<string, any>;
  set: (patch: Record<string, any>) => void;
  err: (field: string) => string | undefined;
  idPrefix: string;
};

const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/* ---------- Shared: map picker with "use same rooms" ---------- */

type MapSource = { key: string; label: string; rooms: string[] };

function MapPicker({
  department,
  details,
  set,
  err,
  sources,
}: SectionProps & { department: Department; sources: MapSource[] }) {
  const shared = details.mapMode === "shared";
  const source = sources.find((s) => s.key === details.sharedKey);

  return (
    <div className="space-y-4">
      {sources.length > 0 && (
        <div className="rounded-xl border border-border bg-field/60 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Copy className="h-4 w-4 text-primary" />
            You already picked rooms earlier in this form
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {sources.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => set({ mapMode: "shared", sharedKey: s.key })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  shared && details.sharedKey === s.key
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-input bg-field text-muted-foreground hover:text-foreground",
                )}
              >
                Use same rooms as <span className="font-semibold text-foreground">{s.label}</span>
                <span className="block text-xs text-muted-foreground">{s.rooms.length} room{s.rooms.length === 1 ? "" : "s"}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => set({ mapMode: "new", sharedKey: "" })}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                !shared ? "border-primary bg-primary/15 text-foreground" : "border-input bg-field text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-semibold text-foreground">Choose different rooms</span>
              <span className="block text-xs text-muted-foreground">Pick on the map below</span>
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <MapPinned className={cn("h-4 w-4", DEPT[department].text)} />
          {shared ? "Rooms (copied)" : "Select the rooms"}
          <span className="text-primary">*</span>
        </p>
        {shared && source ? (
          <VenueMap value={source.rooms} department={department} readOnly />
        ) : (
          <VenueMap value={details.rooms ?? []} onChange={(rooms) => set({ rooms })} department={department} />
        )}
        <ErrorText msg={err("rooms")} />
      </div>
    </div>
  );
}

function Schedule({ details, set, err, idPrefix, note }: SectionProps & { note: string }) {
  return (
    <div>
      <SubHeading>{note}</SubHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" required error={err("startDate")}>
          <TextInput id={`${idPrefix}-sd`} type="date" value={details.startDate ?? ""} onChange={(e) => set({ startDate: e.target.value })} invalid={!!err("startDate")} />
        </Field>
        <Field label="End date" required error={err("endDate")}>
          <TextInput type="date" value={details.endDate ?? ""} min={details.startDate || undefined} onChange={(e) => set({ endDate: e.target.value })} invalid={!!err("endDate")} />
        </Field>
        <Field label="Start time" required error={err("startTime")}>
          <TextInput type="time" value={details.startTime ?? ""} onChange={(e) => set({ startTime: e.target.value })} invalid={!!err("startTime")} />
        </Field>
        <Field label="Stop time" required error={err("endTime")}>
          <TextInput type="time" value={details.endTime ?? ""} onChange={(e) => set({ endTime: e.target.value })} invalid={!!err("endTime")} />
        </Field>
      </div>
    </div>
  );
}

/* ---------- Facilities ---------- */

export function FacilitiesSection(props: SectionProps & { sources: MapSource[] }) {
  return (
    <div className="space-y-6">
      <MapPicker {...props} department="facilities" />
      <Schedule {...props} note="When should the AC / heating be on?" />
    </div>
  );
}

/* ---------- IT / Network ---------- */

export function ItNetworkSection(props: SectionProps & { sources: MapSource[] }) {
  const { details, set, err } = props;
  const networks: string[] = details.networks?.length ? details.networks : [""];
  return (
    <div className="space-y-6">
      <MapPicker {...props} department="it_network" />
      <Schedule {...props} note="When should these doors stay unlocked?" />
      <div className="space-y-3">
        <SubHeading>Event Wi-Fi</SubHeading>
        <Field label="Does the event need a dedicated Wi-Fi network?" required error={err("wifiNeeded")}>
          <YesNo value={details.wifiNeeded ?? null} onChange={(v) => set({ wifiNeeded: v })} invalid={!!err("wifiNeeded")} />
        </Field>
        {details.wifiNeeded && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Network name{networks.length > 1 ? "s" : ""} <span className="text-primary">*</span>
            </p>
            {networks.map((n, i) => (
              <div key={i} className="flex gap-2">
                <TextInput
                  value={n}
                  maxLength={32}
                  placeholder={i === 0 ? "e.g. BAPS-Shibir-Guest" : "Another network name"}
                  onChange={(e) => set({ networks: networks.map((x, j) => (j === i ? e.target.value : x)) })}
                />
                {networks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => set({ networks: networks.filter((_, j) => j !== i) })}
                    className="rounded-lg border border-input px-3 text-muted-foreground hover:text-destructive"
                    aria-label="Remove network"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <ErrorText msg={err("networks")} />
            {networks.length < 10 && (
              <button type="button" onClick={() => set({ networks: [...networks, ""] })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <Plus className="h-4 w-4" /> Add another network
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Kitchen ---------- */

export function KitchenSection({ details, set, err }: SectionProps) {
  const services: any[] = details.services ?? [];
  const setService = (i: number, patch: Record<string, any>) =>
    set({ services: services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const accent = "border-dept-kitchen bg-dept-kitchen/15 text-foreground";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SubHeading>Meals to serve</SubHeading>
        {services.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-field/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Day {i + 1}</span>
              {services.length > 1 && (
                <button type="button" onClick={() => set({ services: services.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive" aria-label="Remove day">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
              <Field label="Date" required error={err(`services.${i}.date`)}>
                <TextInput type="date" value={s.date} onChange={(e) => setService(i, { date: e.target.value })} invalid={!!err(`services.${i}.date`)} />
              </Field>
              <Field label="Number of people" required error={err(`services.${i}.people`)}>
                <TextInput type="number" inputMode="numeric" min={1} placeholder="e.g. 250" value={s.people} onChange={(e) => setService(i, { people: e.target.value })} invalid={!!err(`services.${i}.people`)} />
              </Field>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">
                Meals <span className="text-primary">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {MEALS.map((m) => (
                  <CheckChip key={m} checked={s.meals.includes(m)} onToggle={() => setService(i, { meals: toggleIn(s.meals, m) })} accent={accent}>
                    {MEAL_LABEL[m]}
                  </CheckChip>
                ))}
              </div>
              <ErrorText msg={err(`services.${i}.meals`)} />
            </div>
          </div>
        ))}
        <ErrorText msg={err("services")} />
        <button
          type="button"
          onClick={() => set({ services: [...services, { date: services.at(-1)?.date ?? "", meals: [], people: services.at(-1)?.people ?? "" }] })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <Plus className="h-4 w-4" /> Add another day
        </button>
      </div>

      <div className="space-y-4">
        <SubHeading>Early volunteers</SubHeading>
        <Field label="Will volunteers arrive early to help set up?" required error={err("volunteersEarly")}>
          <YesNo value={details.volunteersEarly ?? null} onChange={(v) => set({ volunteersEarly: v })} invalid={!!err("volunteersEarly")} />
        </Field>
        {details.volunteersEarly && (
          <div className="space-y-4 rounded-xl border border-border bg-field/50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Arrival date" required error={err("volunteerArrival")}>
                <TextInput type="date" value={details.volunteerArrival} onChange={(e) => set({ volunteerArrival: e.target.value })} invalid={!!err("volunteerArrival")} />
              </Field>
              <Field label="How many volunteers?" required error={err("volunteerCount")}>
                <TextInput type="number" inputMode="numeric" min={1} value={details.volunteerCount} onChange={(e) => set({ volunteerCount: e.target.value })} invalid={!!err("volunteerCount")} />
              </Field>
            </div>
            <Field label="Do they need food?" required>
              <YesNo value={details.volunteersNeedFood ?? null} onChange={(v) => set({ volunteersNeedFood: v })} />
            </Field>
            {details.volunteersNeedFood && (
              <div>
                <p className="mb-2 text-sm font-semibold">
                  Which meals? <span className="text-primary">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {MEALS.map((m) => (
                    <CheckChip key={m} checked={details.volunteerMeals.includes(m)} onToggle={() => set({ volunteerMeals: toggleIn(details.volunteerMeals, m) })} accent={accent}>
                      {MEAL_LABEL[m]}
                    </CheckChip>
                  ))}
                </div>
                <ErrorText msg={err("volunteerMeals")} />
              </div>
            )}
          </div>
        )}
      </div>

      <Field label="Allergy information" hint="Optional — nut-free, gluten-free, Jain, etc.">
        <TextArea value={details.allergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="List any allergies or dietary needs and roughly how many people" className="min-h-[80px]" />
      </Field>
    </div>
  );
}

/* ---------- Audio / Video ---------- */

export function AudioVideoSection({ details, set, err }: SectionProps) {
  const items: string[] = details.items ?? [];
  const quantities: Record<string, any> = details.quantities ?? {};
  const accent = "border-dept-audio-video bg-dept-audio-video/15 text-foreground";

  const group = (title: string, list: ReadonlyArray<{ id: string; label: string; qty: boolean }>) => (
    <div>
      <SubHeading>{title}</SubHeading>
      <div className="flex flex-wrap gap-2">
        {list.map((it) => {
          const on = items.includes(it.id);
          return (
            <div key={it.id} className="flex items-stretch gap-1.5">
              <CheckChip checked={on} onToggle={() => set({ items: toggleIn(items, it.id) })} accent={accent}>
                {it.label}
              </CheckChip>
              {it.qty && on && (
                <div className="flex flex-col">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    aria-label={`How many ${it.label.toLowerCase()}`}
                    placeholder="Qty"
                    value={quantities[it.id] ?? ""}
                    onChange={(e) => set({ quantities: { ...quantities, [it.id]: e.target.value } })}
                    className={cn(inputClass, "h-full w-20 py-1.5", err(`quantities.${it.id}`) && "border-destructive")}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {list.map((it) => (it.qty ? <ErrorText key={it.id} msg={err(`quantities.${it.id}`) && `${it.label}: ${err(`quantities.${it.id}`)}`} /> : null))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <SubHeading>Locations</SubHeading>
        <div className="flex flex-wrap gap-2">
          {AV_LOCATIONS.map((l) => (
            <CheckChip key={l} checked={(details.locations ?? []).includes(l)} onToggle={() => set({ locations: toggleIn(details.locations ?? [], l) })} accent={accent}>
              {l}
            </CheckChip>
          ))}
        </div>
        <ErrorText msg={err("locations")} />
      </div>
      {group("Audio", AV_AUDIO)}
      {group("Video", AV_VIDEO)}
      {group("Misc", AV_MISC)}
      <ErrorText msg={err("items")} />
    </div>
  );
}

/* ---------- Photo / Video ---------- */

export function PhotoVideoSection({ details, set, err }: SectionProps) {
  const items: Record<string, string> = details.items ?? {};
  const accent = "border-dept-photo-video bg-dept-photo-video/15 text-foreground";
  const toggle = (id: string) => {
    const next = { ...items };
    if (id in next) delete next[id];
    else next[id] = "";
    set({ items: next });
  };

  const group = (title: string, sub: string, list: ReadonlyArray<{ id: string; label: string }>) => (
    <div>
      <SubHeading>{title}</SubHeading>
      <p className="-mt-2 mb-3 text-sm text-muted-foreground">{sub}</p>
      <div className="flex flex-wrap gap-2">
        {list.map((it) => (
          <CheckChip key={it.id} checked={it.id in items} onToggle={() => toggle(it.id)} accent={accent}>
            {it.label}
          </CheckChip>
        ))}
      </div>
      <div className="mt-3 space-y-3">
        {list
          .filter((it) => it.id in items)
          .map((it) => (
            <Field key={it.id} label={`${it.label} details`} required error={err(`items.${it.id}`)}>
              <TextArea
                value={items[it.id]}
                onChange={(e) => set({ items: { ...items, [it.id]: e.target.value } })}
                placeholder="Size, quantity, content, style, where it will be used…"
                className="min-h-[80px]"
                invalid={!!err(`items.${it.id}`)}
              />
            </Field>
          ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {group("Design studio", "Graphics, prints, backdrops and templates", DESIGN_ITEMS)}
      {group("Photo / Video coverage", "Photographers and videographers for the event", MEDIA_ITEMS)}
      <ErrorText msg={err("items")} />
      <Field label="Needed by" hint="Optional — when should designs be ready?" className="sm:max-w-xs">
        <TextInput type="date" value={details.neededBy ?? ""} onChange={(e) => set({ neededBy: e.target.value })} />
      </Field>
    </div>
  );
}

/* ---------- Parking ---------- */

export function ParkingSection({ details, set, err }: SectionProps) {
  const accent = "border-dept-parking bg-dept-parking/15 text-foreground";
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" required error={err("date")}>
          <TextInput type="date" value={details.date ?? ""} onChange={(e) => set({ date: e.target.value })} invalid={!!err("date")} />
        </Field>
        <Field label="Expected vehicles" required error={err("vehicles")}>
          <TextInput type="number" inputMode="numeric" min={1} placeholder="e.g. 120" value={details.vehicles ?? ""} onChange={(e) => set({ vehicles: e.target.value })} invalid={!!err("vehicles")} />
        </Field>
        <Field label="Start time" required error={err("startTime")}>
          <TextInput type="time" value={details.startTime ?? ""} onChange={(e) => set({ startTime: e.target.value })} invalid={!!err("startTime")} />
        </Field>
        <Field label="End time" required error={err("endTime")}>
          <TextInput type="time" value={details.endTime ?? ""} onChange={(e) => set({ endTime: e.target.value })} invalid={!!err("endTime")} />
        </Field>
      </div>
      <div>
        <SubHeading>What do you need?</SubHeading>
        <div className="flex flex-wrap gap-2">
          {PARKING_NEEDS.map((n) => (
            <CheckChip key={n.id} checked={(details.needs ?? []).includes(n.id)} onToggle={() => set({ needs: toggleIn(details.needs ?? [], n.id) })} accent={accent}>
              {n.label}
            </CheckChip>
          ))}
        </div>
      </div>
    </div>
  );
}
