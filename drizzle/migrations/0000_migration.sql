-- Departments and roles
create type public.department as enum ('facilities','it_network','kitchen','audio_video','photo_video','parking');
create type public.app_role as enum ('master','lead');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  department public.department,
  display_name text not null default '',
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create or replace function public.user_department(_user_id uuid)
returns public.department language sql stable security definer set search_path = public as $$
  select department from public.user_roles where user_id = _user_id and role = 'lead' limit 1
$$;

create policy "Users read own role" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'master'));

-- Events (one card per real-world event; many submissions merge into one)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  start_date date not null,
  end_date date not null,
  source text not null default 'request' check (source in ('request','import')),
  location text,
  description text,
  departments public.department[] not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_normalized_name_idx on public.events (normalized_name);
create index events_start_date_idx on public.events (start_date);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;

create policy "Staff read relevant events" on public.events for select to authenticated
  using (
    public.has_role(auth.uid(), 'master')
    or (public.is_staff(auth.uid()) and (source = 'import' or public.user_department(auth.uid()) = any(departments)))
  );
create policy "Staff import events" on public.events for insert to authenticated
  with check (public.is_staff(auth.uid()) and source = 'import');
create policy "Master updates events" on public.events for update to authenticated
  using (public.has_role(auth.uid(), 'master')) with check (public.has_role(auth.uid(), 'master'));
create policy "Master deletes events" on public.events for delete to authenticated
  using (public.has_role(auth.uid(), 'master'));

-- Submissions (one per form sent)
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  requester_name text not null,
  phone text not null,
  email text not null,
  team text not null,
  event_name text not null,
  event_date date not null,
  created_at timestamptz not null default now()
);
create index submissions_event_idx on public.submissions (event_id);

-- Department requests (several per submission)
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  department public.department not null,
  details jsonb not null default '{}'::jsonb,
  comments text,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new','in_progress','confirmed','completed','declined')),
  internal_notes text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requests_event_idx on public.requests (event_id);
create index requests_submission_idx on public.requests (submission_id);
create index requests_department_idx on public.requests (department);

grant select, delete on public.submissions to authenticated;
grant all on public.submissions to service_role;
grant select, delete on public.requests to authenticated;
grant update (status, internal_notes, updated_at) on public.requests to authenticated;
grant all on public.requests to service_role;

alter table public.submissions enable row level security;
alter table public.requests enable row level security;

create policy "Staff read own department requests" on public.requests for select to authenticated
  using (public.has_role(auth.uid(), 'master') or department = public.user_department(auth.uid()));
create policy "Staff update own department requests" on public.requests for update to authenticated
  using (public.has_role(auth.uid(), 'master') or department = public.user_department(auth.uid()))
  with check (public.has_role(auth.uid(), 'master') or department = public.user_department(auth.uid()));
create policy "Master deletes requests" on public.requests for delete to authenticated
  using (public.has_role(auth.uid(), 'master'));

create policy "Staff read related submissions" on public.submissions for select to authenticated
  using (
    public.has_role(auth.uid(), 'master')
    or exists (select 1 from public.requests r where r.submission_id = submissions.id and r.department = public.user_department(auth.uid()))
  );
create policy "Master deletes submissions" on public.submissions for delete to authenticated
  using (public.has_role(auth.uid(), 'master'));

-- Keep each event's department list and date range in sync with its requests
create or replace function public.refresh_event(_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  d_start date;
  d_end date;
  deps public.department[];
begin
  select min(s.a), max(s.b) into d_start, d_end from (
    select event_date as a, event_date as b from public.submissions where event_id = _event_id
    union all
    select coalesce(start_date, end_date), coalesce(end_date, start_date) from public.requests
      where event_id = _event_id and (start_date is not null or end_date is not null)
  ) s;

  select coalesce(array_agg(distinct department order by department), '{}') into deps
    from public.requests where event_id = _event_id;

  update public.events e set
    departments = deps,
    start_date = case
      when d_start is null then e.start_date
      when e.source = 'import' then least(e.start_date, d_start)
      else d_start end,
    end_date = case
      when d_end is null then e.end_date
      when e.source = 'import' then greatest(e.end_date, d_end)
      else d_end end,
    updated_at = now()
  where e.id = _event_id;
end;
$$;

create or replace function public.trg_refresh_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_event(old.event_id);
    return old;
  end if;
  perform public.refresh_event(new.event_id);
  if tg_op = 'UPDATE' and old.event_id is distinct from new.event_id then
    perform public.refresh_event(old.event_id);
  end if;
  return new;
end;
$$;

create trigger requests_refresh_event after insert or update or delete on public.requests
  for each row execute function public.trg_refresh_event();
create trigger submissions_refresh_event after insert or update or delete on public.submissions
  for each row execute function public.trg_refresh_event();

-- Master can merge two event cards that are really the same event
create or replace function public.merge_events(_from uuid, _into uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'master') then
    raise exception 'Only the master account can merge events';
  end if;
  if _from = _into then return; end if;
  update public.submissions set event_id = _into where event_id = _from;
  update public.requests set event_id = _into where event_id = _from;
  delete from public.events where id = _from;
  perform public.refresh_event(_into);
end;
$$;
revoke execute on function public.merge_events(uuid, uuid) from public, anon;
grant execute on function public.merge_events(uuid, uuid) to authenticated;
revoke execute on function public.refresh_event(uuid) from public, anon, authenticated;