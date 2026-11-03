import { describe, expect, it } from "vitest";
import { findMatchingEvent, normalizeEventName, requestDateRange, submissionDateRange } from "@/lib/event-matching";

const existing = { id: "e1", normalized_name: normalizeEventName("Diwali Celebration"), start_date: "2026-11-08", end_date: "2026-11-09" };

describe("grouping requests into one event", () => {
  it("treats differently typed names for the same event as one event", () => {
    expect(normalizeEventName("  DIWALI   celebration! ")).toBe(normalizeEventName("Diwali Celebration"));
    expect(normalizeEventName("Diwali Celebration 2026")).toBe(normalizeEventName("Diwali Celebration"));
  });

  it("merges a request into an existing event when its date overlaps", () => {
    expect(findMatchingEvent([existing], "diwali celebration", { start: "2026-11-09", end: "2026-11-09" })?.id).toBe("e1");
  });

  it("does not merge the same name held months apart", () => {
    expect(findMatchingEvent([existing], "Diwali Celebration", { start: "2027-10-29", end: "2027-10-29" })).toBeUndefined();
  });

  it("does not merge events with different names on the same day", () => {
    expect(findMatchingEvent([existing], "Youth Shibir", { start: "2026-11-08", end: "2026-11-08" })).toBeUndefined();
  });
});

describe("event date range", () => {
  it("spans the event date and every department's dates", () => {
    const range = submissionDateRange("2026-11-08", [
      { department: "facilities", details: { startDate: "2026-11-07", endDate: "2026-11-09" } },
      { department: "kitchen", details: { services: [{ date: "2026-11-08" }], volunteersEarly: true, volunteerArrival: "2026-11-06" } },
    ]);
    expect(range).toEqual({ start: "2026-11-06", end: "2026-11-09" });
  });

  it("ignores the volunteer arrival date when no volunteers come early", () => {
    expect(requestDateRange({ department: "kitchen", details: { services: [{ date: "2026-11-08" }], volunteersEarly: false, volunteerArrival: "2026-11-01" } })).toEqual({
      start: "2026-11-08",
      end: "2026-11-08",
    });
  });
});
