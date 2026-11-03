import { describe, expect, it } from "vitest";
import { emptyDraft, resolveRooms, toPayloadDetails, type DraftRequest } from "@/components/form/draft";
import { audioVideoSchema, itNetworkSchema } from "@/lib/request-schema";

const facilities: DraftRequest = {
  ...emptyDraft(),
  key: "fac",
  department: "facilities",
  details: { mapMode: "new", sharedKey: "", rooms: ["f1-gym", "f2-room-201"], startDate: "2026-11-08", endDate: "2026-11-08", startTime: "08:00", endTime: "17:00" },
};

describe("IT / Network can reuse the Facilities map", () => {
  it("copies the rooms picked for Facilities when 'use same rooms' is chosen", () => {
    const it: DraftRequest = { ...emptyDraft(), key: "it", department: "it_network", details: { mapMode: "shared", sharedKey: "fac", rooms: [] } };
    expect(resolveRooms([facilities, it], 1).rooms).toEqual(["f1-gym", "f2-room-201"]);
  });

  it("keeps its own rooms when 'choose different rooms' is chosen", () => {
    const it: DraftRequest = { ...emptyDraft(), key: "it", department: "it_network", details: { mapMode: "new", sharedKey: "", rooms: ["f1-lobby"] } };
    expect(resolveRooms([facilities, it], 1).rooms).toEqual(["f1-lobby"]);
  });
});

describe("IT / Network Wi-Fi", () => {
  const base = { rooms: ["f1-gym"], startDate: "2026-11-08", endDate: "2026-11-08", startTime: "08:00", endTime: "17:00" };
  it("requires a network name when dedicated Wi-Fi is needed", () => {
    expect(itNetworkSchema.safeParse({ ...base, wifiNeeded: true, networks: [] }).success).toBe(false);
  });
  it("accepts several network names", () => {
    expect(itNetworkSchema.safeParse({ ...base, wifiNeeded: true, networks: ["Guest", "Volunteers"] }).success).toBe(true);
  });
});

describe("Audio / Video quantities", () => {
  it("asks how many when mics are selected", () => {
    expect(audioVideoSchema.safeParse({ locations: ["Gym"], items: ["mics"], quantities: {} }).success).toBe(false);
    expect(audioVideoSchema.safeParse({ locations: ["Gym"], items: ["mics"], quantities: { mics: 4 } }).success).toBe(true);
  });
  it("drops quantities for items that were unselected", () => {
    const d: DraftRequest = { ...emptyDraft(), department: "audio_video", details: { locations: ["Gym"], items: ["fender"], quantities: { mics: "4" } } };
    expect(toPayloadDetails([d], 0)).toEqual({ locations: ["Gym"], items: ["fender"], quantities: {} });
  });
});
