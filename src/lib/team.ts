import { z } from "zod";
import { DEPARTMENTS, STAFF_ACCOUNTS, accountEmail, type Department } from "./departments";

export type StaffRole = "master" | "lead" | "member";
export type Caller = { role: StaffRole | null; department: Department | null };

/** Departments that get the card-style "Request Management" board. */
export const BOARD_DEPARTMENTS: readonly Department[] = DEPARTMENTS;

const RESERVED = new Set<string>([...STAFF_ACCOUNTS.map((a) => a.slug), "admin", "staff", "team"]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,29}$/, "Use 3–30 letters, numbers, dots or dashes")
  .refine((u) => !RESERVED.has(u), "That username is reserved for a team account");

export const newMemberSchema = z.object({
  department: z.enum(["facilities", "it_network", "kitchen", "audio_video", "photo_video", "parking"]),
  displayName: z.string().trim().min(2, "Enter their name").max(60),
  username: usernameSchema,
  password: z.string().min(10, "Use at least 10 characters").max(72),
});

export const memberEmail = (username: string) => accountEmail(username.trim().toLowerCase());

/** Master manages every team; a department lead manages only their own team. Members manage nobody. */
export function canManageTeam(caller: Caller | null | undefined, department: Department | null | undefined): boolean {
  if (!caller || !department) return false;
  if (caller.role === "master") return true;
  return caller.role === "lead" && caller.department === department;
}

/** Only team-member logins can be removed or have their password reset by a lead. */
export function canManageAccount(caller: Caller | null | undefined, target: { role: StaffRole; department: Department | null }): boolean {
  if (caller?.role === "master") return true;
  return target.role === "member" && canManageTeam(caller, target.department);
}

export function hasRequestBoard(caller: Caller | null | undefined): boolean {
  if (!caller) return false;
  if (caller.role === "master") return true;
  return !!caller.department && BOARD_DEPARTMENTS.includes(caller.department);
}

/** Which department's board to show: teams always see their own; Master can pick any. */
export function boardDepartment(caller: Caller | null | undefined, requested?: Department | null): Department | null {
  if (!caller) return null;
  if (caller.role === "master") return requested && BOARD_DEPARTMENTS.includes(requested) ? requested : BOARD_DEPARTMENTS[0];
  return caller.department && BOARD_DEPARTMENTS.includes(caller.department) ? caller.department : null;
}

export const roleLabel = (role: string | null | undefined) =>
  role === "master" ? "Master · full access" : role === "lead" ? "Team account" : role === "member" ? "Team member" : "No access";
