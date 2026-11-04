<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Public request form posts through the `submitRequest` server function (service client), never direct table inserts — anonymous users have no table grants, and event grouping must see all events.
- Event grouping logic lives only in `src/lib/event-matching.ts` and is shared by form submission and calendar import — keeps "same event" consistent everywhere.
- `events.departments`, `start_date` and `end_date` are maintained by the `refresh_event` database trigger — never write them from app code.
- Staff accounts use synthetic emails `<name>@staff.bapshouston.app`: shared team accounts (`lead` role, `STAFF_ACCOUNTS`) are picked by team name; individual `member` logins use a username — no real inboxes exist yet. Roles, department and username live in `user_roles`.
- Team-management permissions live only in `src/lib/team.ts` (`canManageTeam`/`canManageAccount`) and are enforced in `team.functions.ts` server functions — a lead manages only `member` logins of their own department; Master manages all.
- Card boards are enabled per department via `BOARD_DEPARTMENTS`; board columns are request statuses, so status stays the single source of truth.
- Team accounts and members may only update `status`, `internal_notes` and `assigned_to` on requests (column grants + RLS); a trigger keeps assignees within the request's department; request details are immutable after submission.
- Floor plan rooms are data in `src/lib/venue-map.ts`; saved requests store room ids — replace coordinates, keep ids stable when swapping in the real floor plan.
- Department colors are CSS tokens (`--dept-*`) and literal class strings in `DEPT`; the signed-in account's color is `--account` via `data-account` — never build Tailwind class names dynamically.
- tsconfig keeps `strict` but disables `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `noPropertyAccessFromIndexSignature` — dynamic per-department form details made them pure noise.
