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
- Staff accounts use synthetic emails `<slug>@staff.bapshouston.app` (see `STAFF_ACCOUNTS`); roles and department live in `user_roles` — logins are picked by team name, no real inboxes exist yet.
- Department leads may only update `status` and `internal_notes` on requests (column grants + RLS); request details are immutable after submission.
- Floor plan rooms are data in `src/lib/venue-map.ts`; saved requests store room ids — replace coordinates, keep ids stable when swapping in the real floor plan.
- Department colors are CSS tokens (`--dept-*`) and literal class strings in `DEPT`; the signed-in account's color is `--account` via `data-account` — never build Tailwind class names dynamically.
- tsconfig keeps `strict` but disables `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `noPropertyAccessFromIndexSignature` — dynamic per-department form details made them pure noise.
