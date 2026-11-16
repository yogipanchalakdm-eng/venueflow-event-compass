import { describe, expect, it } from "vitest";
import { canOpenEvent, dashboardEvents } from "@/lib/event-access";

const events = [{ id: "kitchen-only", departments: ["kitchen"] }, { id: "shared", departments: ["facilities", "audio_video"] }, { id: "imported", departments: [] }];
const facilities = { role: "lead", department: "facilities" };
describe("event visibility and interaction", () => {
  it("a department can open only its requested events", () => {
    expect(events.map((event) => canOpenEvent(event, facilities))).toEqual([false, true, false]);
  });
  it("department dashboards exclude other teams and unassigned imported events", () => {
    expect(dashboardEvents(events, facilities).map((event) => event.id)).toEqual(["shared"]);
  });
  it("Master can open all events", () => {
    expect(dashboardEvents(events, { role: "master", department: null })).toEqual(events);
  });
  it("members have the same department scope", () => {
    expect(dashboardEvents(events, { role: "member", department: "kitchen" }).map((event) => event.id)).toEqual(["kitchen-only"]);
  });
  it("an account without a staff role cannot open events", () => {
    expect(dashboardEvents(events, { role: null, department: "facilities" })).toEqual([]);
  });
});