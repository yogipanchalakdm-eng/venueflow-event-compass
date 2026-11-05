import { describe, expect, it } from "vitest";
import { boardDepartment, canManageAccount, canManageTeam, hasRequestBoard, memberEmail, usernameSchema } from "@/lib/team";

const master = { role: "master" as const, department: null };
const pvLead = { role: "lead" as const, department: "photo_video" as const };
const pvMember = { role: "member" as const, department: "photo_video" as const };
const kitchenLead = { role: "lead" as const, department: "kitchen" as const };

describe("who can add team members", () => {
  it("lets a team's main account add people to its own team", () => {
    expect(canManageTeam(pvLead, "photo_video")).toBe(true);
  });
  it("stops a team's main account from adding people to another team", () => {
    expect(canManageTeam(pvLead, "kitchen")).toBe(false);
    expect(canManageTeam(kitchenLead, "photo_video")).toBe(false);
  });
  it("stops team members from adding anyone", () => {
    expect(canManageTeam(pvMember, "photo_video")).toBe(false);
  });
  it("lets Master add people to any team", () => {
    expect(canManageTeam(master, "parking")).toBe(true);
  });
});

describe("who can reset or remove a login", () => {
  it("lets a lead manage members of their own team only", () => {
    expect(canManageAccount(pvLead, { role: "member", department: "photo_video" })).toBe(true);
    expect(canManageAccount(pvLead, { role: "member", department: "kitchen" })).toBe(false);
  });
  it("never lets a lead manage another team account or Master", () => {
    expect(canManageAccount(pvLead, { role: "lead", department: "photo_video" })).toBe(false);
    expect(canManageAccount(pvLead, { role: "master", department: null })).toBe(false);
  });
});

describe("Request Management board", () => {
  it("is available to every department and Master", () => {
    expect(hasRequestBoard(pvLead)).toBe(true);
    expect(hasRequestBoard(pvMember)).toBe(true);
    expect(hasRequestBoard(master)).toBe(true);
    expect(hasRequestBoard(kitchenLead)).toBe(true);
    expect(hasRequestBoard({ role: "member", department: "parking" })).toBe(true);
    expect(hasRequestBoard({ role: null, department: null })).toBe(false);
  });
  it("shows each team only its own board", () => {
    expect(boardDepartment(kitchenLead, "photo_video")).toBe("kitchen");
    expect(boardDepartment(pvMember)).toBe("photo_video");
  });
  it("lets Master switch between team boards", () => {
    expect(boardDepartment(master, "parking")).toBe("parking");
    expect(boardDepartment(master)).toBe("facilities");
  });
});

describe("member usernames", () => {
  it("rejects names already used by team accounts", () => {
    expect(usernameSchema.safeParse("master").success).toBe(false);
    expect(usernameSchema.safeParse("photo-video").success).toBe(false);
  });
  it("signs members in with a lower-case username", () => {
    expect(usernameSchema.parse("Priya.Patel")).toBe("priya.patel");
    expect(memberEmail("Priya.Patel")).toBe("priya.patel@staff.bapshouston.app");
  });
});
