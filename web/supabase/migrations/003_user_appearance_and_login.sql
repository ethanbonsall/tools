-- Appearance prefs on public.users + username login helper.
-- Safe to re-run if columns already exist.

alter table public.users
  add column if not exists color text,
  add column if not exists text text,
  add column if not exists accent text,
  add column if not exists mobile boolean default true,
  add column if not exists desktop boolean default true;

comment on column public.users.color is 'Background / canvas hex color';
comment on column public.users.text is 'Primary text hex color';
comment on column public.users.accent is 'Accent / mint hex color';
comment on column public.users.mobile is 'true = stacked todo days on mobile; false = horizontal scroll';
comment on column public.users.desktop is 'true = side-by-side todo days on desktop; false = horizontal scroll';

-- Resolve email for login by email or username (anon-callable).
create or replace function public.email_for_login(identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text := lower(trim(identifier));
  found text;
begin
  if cleaned is null or cleaned = '' then
    return null;
  end if;

  if position('@' in cleaned) > 0 then
    select u.email into found
    from public.users u
    where lower(u.email) = cleaned
    limit 1;
    return coalesce(found, cleaned);
  end if;

  select u.email into found
  from public.users u
  where lower(u.username) = cleaned
  limit 1;

  return found;
end;
$$;

revoke all on function public.email_for_login(text) from public;
grant execute on function public.email_for_login(text) to anon, authenticated;
