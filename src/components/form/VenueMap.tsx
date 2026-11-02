import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPT, type Department } from "@/lib/departments";
import { FIXTURES, MAP_HEIGHT, MAP_WIDTH, ROOMS, ROOM_BY_ID, roomsOnFloor, type Floor, type Room } from "@/lib/venue-map";

type Props = {
  value: string[];
  onChange?: (next: string[]) => void;
  department?: Department;
  readOnly?: boolean;
  compact?: boolean;
};

function labelLines(room: Room) {
  const words = room.name.split(" ");
  const maxChars = Math.max(6, Math.floor(room.w / 13));
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

export function VenueMap({ value, onChange, department = "facilities", readOnly, compact }: Props) {
  const [floor, setFloor] = useState<Floor>(() =>
    value.length && roomsOnFloor(value, 1).length === 0 ? 2 : 1,
  );
  const meta = DEPT[department];
  const selected = new Set(value);

  const toggle = (id: string) => {
    if (readOnly || !onChange) return;
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const floorRooms = ROOMS.filter((r) => r.floor === floor);
  const floorFixtures = FIXTURES.filter((f) => f.floor === floor);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Floor" className="inline-flex rounded-lg border border-border bg-field p-1">
          {([1, 2] as Floor[]).map((f) => {
            const count = roomsOnFloor(value, f).length;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={floor === f}
                onClick={() => setFloor(f)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  floor === f ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === 1 ? "1st floor" : "2nd floor"}
                {count > 0 && (
                  <span className={cn("rounded-full px-1.5 text-xs font-semibold text-primary-foreground", meta.bg)}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!readOnly && (
          <p className="text-xs text-muted-foreground">Tap rooms to select. Your picks stay when you switch floors.</p>
        )}
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className={cn("w-full min-w-[620px] rounded-xl border border-border bg-map-floor", compact && "min-w-[480px]")}
          role="group"
          aria-label={`Floor ${floor} map`}
        >
          <rect x="16" y="16" width={MAP_WIDTH - 32} height={MAP_HEIGHT - 32} rx="14" className="fill-none stroke-map-wall" strokeWidth="3" />
          {floorFixtures.map((f) => (
            <g key={f.label}>
              <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="6" className="fill-none stroke-map-wall" strokeDasharray="6 6" strokeWidth="1.5" />
              <text x={f.x + f.w / 2} y={f.y + f.h / 2 + 5} textAnchor="middle" className="fill-muted-foreground" fontSize="13">
                {f.h > 30 ? f.label : ""}
              </text>
            </g>
          ))}
          {floorRooms.map((room) => {
            const on = selected.has(room.id);
            const lines = labelLines(room);
            return (
              <g
                key={room.id}
                role={readOnly ? undefined : "button"}
                tabIndex={readOnly ? undefined : 0}
                aria-pressed={readOnly ? undefined : on}
                aria-label={room.name}
                onClick={() => toggle(room.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(room.id);
                  }
                }}
                className={cn("group outline-none", !readOnly && "cursor-pointer")}
              >
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.w}
                  height={room.h}
                  rx="8"
                  strokeWidth={on ? 3 : 1.5}
                  className={cn(
                    "transition-all",
                    on ? cn(meta.fill, meta.stroke) : "fill-map-room stroke-map-wall",
                    !readOnly && !on && "group-hover:fill-map-room-hover group-focus-visible:fill-map-room-hover",
                  )}
                  style={on ? { fillOpacity: 0.85 } : undefined}
                />
                {lines.map((ln, i) => (
                  <text
                    key={i}
                    x={room.x + room.w / 2}
                    y={room.y + room.h / 2 + (i - (lines.length - 1) / 2) * 20 + 6}
                    textAnchor="middle"
                    fontSize="17"
                    fontWeight={on ? 700 : 500}
                    className={cn("pointer-events-none select-none", on ? "fill-primary-foreground" : "fill-foreground")}
                  >
                    {ln}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <span
              key={id}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", meta.border, meta.softBg)}
            >
              <span className="text-muted-foreground">{ROOM_BY_ID[id]?.floor === 2 ? "2F" : "1F"}</span>
              {ROOM_BY_ID[id]?.name ?? id}
              {!readOnly && (
                <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${ROOM_BY_ID[id]?.name}`} className="rounded-full p-0.5 hover:bg-foreground/10">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        !readOnly && <p className="text-sm text-muted-foreground">No rooms selected yet.</p>
      )}
    </div>
  );
}
