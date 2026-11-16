type EventTeams = { departments: readonly string[] };
type Account = { role: string | null; department: string | null } | null | undefined;

/** Dashboard scope and event interaction share the same department rule. */
export function canOpenEvent(event: EventTeams, account: Account): boolean {
  if (account?.role === "master") return true;
  return Boolean(account?.role && account.department && event.departments.includes(account.department));
}

export function dashboardEvents<T extends EventTeams>(events: T[], account: Account): T[] {
  return events.filter((event) => canOpenEvent(event, account));
}