alter table public.user_roles add column username text;
create unique index user_roles_username_key on public.user_roles (lower(username)) where username is not null;