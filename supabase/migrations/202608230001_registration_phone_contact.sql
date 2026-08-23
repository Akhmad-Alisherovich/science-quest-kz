begin;

create table if not exists public.user_private_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade deferrable initially deferred,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_contact_phone_e164 check (phone ~ '^\+[1-9][0-9]{7,14}$')
);

alter table public.user_private_contacts enable row level security;

drop policy if exists private_contacts_read_own on public.user_private_contacts;
create policy private_contacts_read_own
on public.user_private_contacts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists private_contacts_insert_own on public.user_private_contacts;
create policy private_contacts_insert_own
on public.user_private_contacts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists private_contacts_update_own on public.user_private_contacts;
create policy private_contacts_update_own
on public.user_private_contacts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on public.user_private_contacts from anon, authenticated;
grant select, insert, update on public.user_private_contacts to authenticated;

create or replace function public._normalize_contact_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(coalesce(p_phone, ''), '[[:space:]()-]', '', 'g');
$$;

revoke all on function public._normalize_contact_phone(text) from public, anon, authenticated;

create or replace function public._touch_private_contact_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists private_contact_updated_at on public.user_private_contacts;
create trigger private_contact_updated_at
before update on public.user_private_contacts
for each row execute function public._touch_private_contact_updated_at();

create or replace function public._capture_registration_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := public._normalize_contact_phone(new.raw_user_meta_data ->> 'registration_phone');
begin
  if v_phone <> '' then
    if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception 'phone_invalid' using errcode = '22023';
    end if;

    insert into public.user_private_contacts(user_id, phone)
    values (new.id, v_phone)
    on conflict (user_id) do update
    set phone = excluded.phone, updated_at = now();

    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'registration_phone';
  end if;
  return new;
end;
$$;

drop trigger if exists auth_user_capture_registration_phone on auth.users;
create trigger auth_user_capture_registration_phone
before insert on auth.users
for each row execute function public._capture_registration_phone();

create or replace function public.save_my_private_contact(p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_phone text := public._normalize_contact_phone(p_phone);
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'phone_invalid' using errcode = '22023';
  end if;

  insert into public.user_private_contacts(user_id, phone)
  values (v_user, v_phone)
  on conflict (user_id) do update
  set phone = excluded.phone, updated_at = now();
end;
$$;

create or replace function public.get_my_private_contact()
returns table(phone text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  return query
  select contact.phone
  from public.user_private_contacts contact
  where contact.user_id = auth.uid();
end;
$$;

create or replace function public.get_admin_student_contact(p_user_id uuid)
returns table(phone text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public._is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return query
  select contact.phone
  from public.user_private_contacts contact
  where contact.user_id = p_user_id;
end;
$$;

revoke all on function public._touch_private_contact_updated_at() from public, anon, authenticated;
revoke all on function public._capture_registration_phone() from public, anon, authenticated;
revoke all on function public.save_my_private_contact(text) from public, anon;
revoke all on function public.get_my_private_contact() from public, anon;
revoke all on function public.get_admin_student_contact(uuid) from public, anon;

grant execute on function public.save_my_private_contact(text) to authenticated;
grant execute on function public.get_my_private_contact() to authenticated;
grant execute on function public.get_admin_student_contact(uuid) to authenticated;

commit;
