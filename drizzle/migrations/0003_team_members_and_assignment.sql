-- Team members share their department's access
create or replace function public.user_department(_user_id uuid)
returns public.department language sql stable security definer set search_path = public as $$
  select department from public.user_roles
  where user_id = _user_id and role in ('lead', 'member')
  order by (role = 'lead') desc
  limit 1
$$;

-- Teammates can see each other (for assigning work and the team list)
create policy "Staff read own department team" on public.user_roles for select to authenticated
  using (department is not null and department = public.user_department(auth.uid()));

-- Requests can be assigned to someone on the same team
alter table public.requests add column assigned_to uuid;
grant update (assigned_to) on public.requests to authenticated;

create or replace function public.trg_check_request_assignee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null and not exists (
    select 1 from public.user_roles
    where user_id = new.assigned_to and department = new.department
  ) then
    raise exception 'Requests can only be assigned to members of the same team';
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_check_request_assignee() from public, anon, authenticated;

create trigger check_request_assignee
  before insert or update of assigned_to on public.requests
  for each row execute function public.trg_check_request_assignee();