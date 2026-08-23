begin;

alter table public.profiles
  add column if not exists avatar_path text;

alter table public.profiles
  drop constraint if exists profiles_avatar_path_owned;
alter table public.profiles
  add constraint profiles_avatar_path_owned check (
    avatar_path is null or avatar_path = id::text || '/avatar.webp'
  );

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatar_objects_select_own on storage.objects;
create policy avatar_objects_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text || '/avatar.webp'
);

drop policy if exists avatar_objects_insert_own on storage.objects;
create policy avatar_objects_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text || '/avatar.webp'
  and owner_id = (select auth.uid())::text
);

drop policy if exists avatar_objects_update_own on storage.objects;
create policy avatar_objects_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text || '/avatar.webp'
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text || '/avatar.webp'
  and owner_id = (select auth.uid())::text
);

drop policy if exists avatar_objects_delete_own on storage.objects;
create policy avatar_objects_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text || '/avatar.webp'
  and owner_id = (select auth.uid())::text
);

create or replace function public.save_profile_with_avatar(
  p_nickname text,
  p_display_name text,
  p_grade smallint default null,
  p_school text default null,
  p_avatar text default '🧑‍🔬',
  p_show_grade boolean default false,
  p_avatar_path text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_nickname text := btrim(p_nickname);
  v_display_name text := btrim(p_display_name);
  v_avatar_path text := nullif(btrim(p_avatar_path), '');
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if char_length(v_nickname) not between 3 and 20 or v_nickname !~ '^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі0-9_-]+$' then
    raise exception 'nickname_invalid' using errcode = '22023';
  end if;
  if lower(v_nickname) ~ '(script|admin|moderator|support)' then raise exception 'nickname_invalid' using errcode = '22023'; end if;
  if char_length(v_display_name) not between 1 and 40 then raise exception 'display_name_invalid' using errcode = '22023'; end if;
  if p_grade is not null and p_grade not between 1 and 12 then raise exception 'grade_invalid' using errcode = '22023'; end if;
  if p_avatar not in ('🧑‍🔬','🚀','🌍','🧬','⚗️','⚡') then raise exception 'avatar_invalid' using errcode = '22023'; end if;
  if v_avatar_path is not null and v_avatar_path <> (v_user::text || '/avatar.webp') then raise exception 'avatar_path_invalid' using errcode = '22023'; end if;
  if v_avatar_path is not null and not exists (
    select 1 from storage.objects object_row
    where object_row.bucket_id = 'avatars' and object_row.name = v_avatar_path and object_row.owner_id = v_user::text
  ) then raise exception 'avatar_not_uploaded' using errcode = '22023'; end if;

  insert into public.profiles(id, nickname, display_name, grade, school, avatar, avatar_path, show_grade)
  values (v_user, v_nickname, v_display_name, p_grade, nullif(btrim(p_school), ''), p_avatar, v_avatar_path, p_show_grade)
  on conflict (id) do update set
    nickname = excluded.nickname,
    display_name = excluded.display_name,
    grade = excluded.grade,
    school = excluded.school,
    avatar = excluded.avatar,
    avatar_path = excluded.avatar_path,
    show_grade = excluded.show_grade,
    updated_at = now();
exception
  when unique_violation then raise exception 'nickname_taken' using errcode = '23505';
end;
$$;

-- Preserve existing RPC signatures: avatar contains either a standard emoji or
-- the public Storage object path. The database still stores the path separately.
create or replace function public._leaderboard_snapshot(p_period text, p_section text, p_grade smallint)
returns table(rank bigint, user_id uuid, nickname text, avatar text, xp bigint, stars bigint, completed_levels bigint, challenge_points bigint, challenges bigint, average_accuracy numeric, grade smallint, reached_at timestamptz, total_count bigint)
language sql stable security definer set search_path = ''
as $$
  with tx as (
    select t.user_id, sum(t.xp)::bigint xp, sum(t.challenge_points)::bigint challenge_points, max(t.created_at) reached_at
    from public.xp_transactions t join public.game_levels gl on gl.level_id = t.level_id
    where (p_section is null or gl.section_id = p_section)
      and (p_period = 'total' or t.created_at >= public._leaderboard_period_start(p_period))
    group by t.user_id
  ), progress as (
    select sp.user_id, sum(sp.stars)::bigint stars, count(*)::bigint completed_levels,
      count(*) filter (where gl.difficulty >= 4)::bigint challenges, round(avg(sp.best_score), 1) average_accuracy
    from public.student_progress sp join public.game_levels gl on gl.level_id = sp.level_id
    where p_section is null or gl.section_id = p_section
      and (p_period = 'total' or sp.completed_at >= public._leaderboard_period_start(p_period))
    group by sp.user_id
  ), base as (
    select p.id user_id, p.nickname, coalesce(p.avatar_path || '?v=' || (extract(epoch from p.updated_at)::bigint)::text, p.avatar) avatar, coalesce(tx.xp,0)::bigint xp,
      coalesce(pr.stars,0)::bigint stars, coalesce(pr.completed_levels,0)::bigint completed_levels,
      coalesce(tx.challenge_points,0)::bigint challenge_points, coalesce(pr.challenges,0)::bigint challenges,
      coalesce(pr.average_accuracy,0)::numeric average_accuracy, case when p.show_grade then p.grade else null end grade, tx.reached_at
    from public.profiles p
    join public.user_roles role_row on role_row.user_id = p.id and role_row.role = 'student'
    left join tx on tx.user_id = p.id left join progress pr on pr.user_id = p.id
    where (p_grade is null or (p.grade = p_grade and p.show_grade))
      and (p_period = 'total' or tx.user_id is not null)
  )
  select row_number() over (order by xp desc, stars desc, challenges desc, average_accuracy desc, reached_at asc nulls last, lower(nickname) asc)::bigint,
    user_id, nickname, avatar, xp, stars, completed_levels, challenge_points, challenges, average_accuracy, grade, reached_at,
    count(*) over ()::bigint
  from base;
$$;

create or replace function public.get_admin_activity(p_days integer default 7, p_event_type text default null, p_user_id uuid default null, p_grade smallint default null, p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table(id bigint, user_id uuid, nickname text, avatar text, grade smallint, event_type text, level_id text, metadata jsonb, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select a.id, a.user_id, p.nickname, coalesce(p.avatar_path || '?v=' || (extract(epoch from p.updated_at)::bigint)::text, p.avatar), p.grade, a.event_type, a.level_id, a.metadata, a.created_at, count(*) over ()::bigint
  from public.student_activity a join public.profiles p on p.id = a.user_id
    join public.user_roles ur on ur.user_id = a.user_id and ur.role = 'student'
  where a.created_at >= now() - make_interval(days => least(greatest(p_days,1),30))
    and (p_event_type is null or a.event_type = p_event_type) and (p_user_id is null or a.user_id = p_user_id) and (p_grade is null or p.grade = p_grade)
    and (p_search is null or btrim(p_search) = '' or p.nickname ilike '%' || btrim(p_search) || '%')
  order by a.created_at desc limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
end;
$$;

revoke all on function public.save_profile_with_avatar(text,text,smallint,text,text,boolean,text) from public, anon;
grant execute on function public.save_profile_with_avatar(text,text,smallint,text,text,boolean,text) to authenticated;

commit;
