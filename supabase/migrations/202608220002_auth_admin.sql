begin;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('LOGIN','LEVEL_STARTED','LEVEL_COMPLETED','CHALLENGE_COMPLETED','ACHIEVEMENT_EARNED','PROFILE_UPDATED')),
  level_id text references public.game_levels(level_id),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists student_activity_user_date on public.student_activity(user_id, created_at desc);
create index if not exists student_activity_date_type on public.student_activity(created_at desc, event_type);
create index if not exists student_activity_level on public.student_activity(level_id, created_at desc) where level_id is not null;

alter table public.user_roles enable row level security;
alter table public.student_activity enable row level security;

drop policy if exists activity_read_own on public.student_activity;
create policy activity_read_own on public.student_activity for select to authenticated using (user_id = auth.uid());

revoke all on public.user_roles, public.student_activity from anon, authenticated;
grant select on public.student_activity to authenticated;

create or replace function public._handle_new_user_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.user_roles(user_id, role) values (new.id, 'student') on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_default_role on auth.users;
create trigger auth_user_default_role after insert on auth.users for each row execute function public._handle_new_user_role();

insert into public.user_roles(user_id, role)
select id, 'student' from auth.users
on conflict (user_id) do nothing;

create or replace function public._is_admin(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.user_roles where user_id = p_user and role = 'admin');
$$;

create or replace function public.get_my_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce((select role from public.user_roles where user_id = auth.uid()), 'student');
$$;

create or replace function public.record_my_activity(p_event_type text, p_level_id text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_event_type not in ('LOGIN','LEVEL_STARTED') then raise exception 'event_not_allowed' using errcode = '22023'; end if;
  if p_event_type = 'LEVEL_STARTED' and not exists(select 1 from public.game_levels where level_id = p_level_id) then
    raise exception 'unknown_level' using errcode = '22023';
  end if;
  if exists(
    select 1 from public.student_activity
    where user_id = v_user and event_type = p_event_type and level_id is not distinct from p_level_id
      and created_at > now() - case when p_event_type = 'LOGIN' then interval '5 minutes' else interval '1 minute' end
  ) then return; end if;
  insert into public.student_activity(user_id, event_type, level_id) values (v_user, p_event_type, p_level_id);
end;
$$;

create or replace function public._log_profile_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.student_activity(user_id, event_type) values (new.id, 'PROFILE_UPDATED');
  return new;
end;
$$;

drop trigger if exists profile_activity_log on public.profiles;
create trigger profile_activity_log after insert or update on public.profiles for each row execute function public._log_profile_activity();

create or replace function public._log_submission_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_event text;
begin
  select case when difficulty >= 4 then 'CHALLENGE_COMPLETED' else 'LEVEL_COMPLETED' end into v_event
  from public.game_levels where level_id = new.level_id;
  insert into public.student_activity(user_id, event_type, level_id, metadata)
  values (new.user_id, v_event, new.level_id, jsonb_build_object('accuracy', new.accuracy, 'mistakes', new.mistakes, 'awarded_xp', new.awarded_xp));
  return new;
end;
$$;

drop trigger if exists submission_activity_log on public.result_submissions;
create trigger submission_activity_log after insert on public.result_submissions for each row execute function public._log_submission_activity();

create or replace function public._log_achievement_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.student_activity(user_id, event_type, metadata)
  values (new.user_id, 'ACHIEVEMENT_EARNED', jsonb_build_object('achievement_code', new.achievement_code));
  return new;
end;
$$;

drop trigger if exists achievement_activity_log on public.student_achievements;
create trigger achievement_activity_log after insert on public.student_achievements for each row execute function public._log_achievement_activity();

create or replace function public.get_admin_dashboard()
returns table(total_students bigint, active_today bigint, active_week bigint, completed_levels bigint, average_xp numeric, average_accuracy numeric, challenges bigint, grade_5 bigint, grade_6 bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query
  with activity as (
    select count(distinct a.user_id) filter (where a.created_at >= date_trunc('day', now())) today,
      count(distinct a.user_id) filter (where a.created_at >= now() - interval '7 days') week
    from public.student_activity a join public.user_roles ur on ur.user_id = a.user_id and ur.role = 'student'
  ), xp as (select user_id, sum(xp)::numeric xp from public.xp_transactions group by user_id)
  select count(p.id)::bigint, coalesce(max(activity.today),0)::bigint, coalesce(max(activity.week),0)::bigint,
    (select count(*) from public.student_progress sp join public.user_roles sr on sr.user_id = sp.user_id where sp.completed and sr.role = 'student')::bigint,
    coalesce((select round(avg(xp.xp),1) from xp join public.user_roles xr on xr.user_id = xp.user_id where xr.role = 'student'),0),
    coalesce((select round(avg(sp.best_score),1) from public.student_progress sp join public.user_roles sr on sr.user_id = sp.user_id where sr.role = 'student'),0),
    (select count(*) from public.student_progress sp join public.game_levels gl on gl.level_id = sp.level_id join public.user_roles sr on sr.user_id = sp.user_id where gl.difficulty >= 4 and sr.role = 'student')::bigint,
    count(*) filter (where p.grade = 5)::bigint, count(*) filter (where p.grade = 6)::bigint
  from public.profiles p join public.user_roles ur on ur.user_id = p.id and ur.role = 'student' cross join activity;
end;
$$;

create or replace function public.get_admin_students(p_search text default null, p_grade smallint default null, p_active text default 'all', p_sort text default 'xp_desc', p_limit integer default 50, p_offset integer default 0)
returns table(user_id uuid, nickname text, avatar text, grade smallint, school text, xp bigint, rank bigint, stars bigint, completed_levels bigint, average_accuracy numeric, last_active timestamptz, registered_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_active not in ('all','today','week') or p_sort not in ('xp_desc','xp_asc','nickname','recent') then raise exception 'filter_invalid' using errcode = '22023'; end if;
  return query
  with last_seen as (select a.user_id, max(a.created_at) last_active from public.student_activity a group by a.user_id),
  board as (select * from public._leaderboard_snapshot('total', null, null)),
  filtered as (
    select p.id user_id, p.nickname, p.avatar, p.grade, p.school, b.xp, b.rank, b.stars, b.completed_levels, b.average_accuracy, ls.last_active, p.created_at registered_at
    from public.profiles p join public.user_roles ur on ur.user_id = p.id and ur.role = 'student'
      join board b on b.user_id = p.id left join last_seen ls on ls.user_id = p.id
    where (p_search is null or btrim(p_search) = '' or p.nickname ilike '%' || btrim(p_search) || '%' or coalesce(p.school,'') ilike '%' || btrim(p_search) || '%')
      and (p_grade is null or p.grade = p_grade)
      and (p_active = 'all' or (p_active = 'today' and ls.last_active >= date_trunc('day', now())) or (p_active = 'week' and ls.last_active >= now() - interval '7 days'))
  )
  select f.user_id, f.nickname, f.avatar, f.grade, f.school, f.xp, f.rank, f.stars, f.completed_levels, f.average_accuracy, f.last_active, f.registered_at, count(*) over ()::bigint
  from filtered f
  order by case when p_sort = 'xp_desc' then f.xp end desc, case when p_sort = 'xp_asc' then f.xp end asc,
    case when p_sort = 'nickname' then lower(f.nickname) end asc, case when p_sort = 'recent' then f.last_active end desc nulls last, lower(f.nickname)
  limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
end;
$$;

create or replace function public.get_admin_student_detail(p_user_id uuid)
returns table(user_id uuid, nickname text, avatar text, grade smallint, school text, xp bigint, rank bigint, stars bigint, completed_levels bigint, total_levels bigint, average_accuracy numeric, current_streak bigint, last_active timestamptz, registered_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query
  with board as (select * from public._leaderboard_snapshot('total', null, null)),
  ordered as (
    select rs.mistakes, sum(case when rs.mistakes > 0 then 1 else 0 end) over(order by rs.created_at desc, rs.submission_id) failures
    from public.result_submissions rs where rs.user_id = p_user_id
  ), streak as (select count(*)::bigint value from ordered where failures = 0 and mistakes = 0)
  select p.id, p.nickname, p.avatar, p.grade, p.school, b.xp, b.rank, b.stars, b.completed_levels,
    (select count(*) from public.game_levels)::bigint, b.average_accuracy, streak.value,
    (select max(a.created_at) from public.student_activity a where a.user_id = p.id), p.created_at
  from public.profiles p join public.user_roles ur on ur.user_id = p.id and ur.role = 'student'
    join board b on b.user_id = p.id cross join streak where p.id = p_user_id;
end;
$$;

create or replace function public.get_admin_student_progress(p_user_id uuid)
returns table(section_id text, completed_levels bigint, total_levels bigint, completion_percent numeric, stars bigint, average_score numeric, mistakes bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query
  with catalog(section_id) as (values ('research'),('earth'),('matter'),('life'),('energy'),('ecology')),
  totals as (select gl.section_id, count(*)::bigint total from public.game_levels gl group by gl.section_id),
  progress as (
    select gl.section_id, count(*)::bigint completed, sum(sp.stars)::bigint stars, round(avg(sp.best_score),1) average_score, sum(sp.mistakes)::bigint mistakes
    from public.student_progress sp join public.game_levels gl on gl.level_id = sp.level_id where sp.user_id = p_user_id group by gl.section_id
  )
  select c.section_id, coalesce(p.completed,0), t.total, round(coalesce(p.completed,0)::numeric / nullif(t.total,0) * 100,1),
    coalesce(p.stars,0), coalesce(p.average_score,0), coalesce(p.mistakes,0)
  from catalog c join totals t on t.section_id = c.section_id left join progress p on p.section_id = c.section_id;
end;
$$;

create or replace function public.get_admin_student_history(p_user_id uuid, p_limit integer default 50, p_offset integer default 0)
returns table(level_id text, completed_at timestamptz, accuracy smallint, stars smallint, attempt_number bigint, xp_earned integer, total_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query
  with history as (
    select rs.level_id, rs.created_at, rs.accuracy,
      (case when rs.accuracy >= 95 then 3 when rs.accuracy >= 70 then 2 else 1 end)::smallint stars,
      row_number() over(partition by rs.level_id order by rs.created_at, rs.submission_id) attempt_number, rs.awarded_xp
    from public.result_submissions rs where rs.user_id = p_user_id
  )
  select h.level_id, h.created_at, h.accuracy, h.stars, h.attempt_number, h.awarded_xp, count(*) over ()::bigint
  from history h order by h.created_at desc limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
end;
$$;

create or replace function public.get_admin_activity(p_days integer default 7, p_event_type text default null, p_user_id uuid default null, p_grade smallint default null, p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table(id bigint, user_id uuid, nickname text, avatar text, grade smallint, event_type text, level_id text, metadata jsonb, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select a.id, a.user_id, p.nickname, p.avatar, p.grade, a.event_type, a.level_id, a.metadata, a.created_at, count(*) over ()::bigint
  from public.student_activity a join public.profiles p on p.id = a.user_id
    join public.user_roles ur on ur.user_id = a.user_id and ur.role = 'student'
  where a.created_at >= now() - make_interval(days => least(greatest(p_days,1),30))
    and (p_event_type is null or a.event_type = p_event_type) and (p_user_id is null or a.user_id = p_user_id) and (p_grade is null or p.grade = p_grade)
    and (p_search is null or btrim(p_search) = '' or p.nickname ilike '%' || btrim(p_search) || '%')
  order by a.created_at desc limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
end;
$$;

create or replace function public.get_admin_daily_analytics(p_days integer default 14)
returns table(day date, active_students bigint, completed_levels bigint, average_accuracy numeric, xp_earned bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query
  with calendar_days as (
    select generated_at::date as day_date
    from generate_series(
      current_date - least(greatest(p_days, 1), 30) + 1,
      current_date,
      interval '1 day'
    ) as generated_at
  ), activity_by_day as (
    select a.created_at::date as day_date, count(distinct a.user_id)::bigint as active_count
    from public.student_activity a
    join public.user_roles ur on ur.user_id = a.user_id and ur.role = 'student'
    group by a.created_at::date
  ), results_by_day as (
    select r.created_at::date as day_date, count(*)::bigint as completed_count,
      round(avg(r.accuracy), 1) as accuracy_average
    from public.result_submissions r
    join public.user_roles ur on ur.user_id = r.user_id and ur.role = 'student'
    group by r.created_at::date
  ), xp_by_day as (
    select x.created_at::date as day_date, sum(x.xp)::bigint as earned_xp
    from public.xp_transactions x
    join public.user_roles ur on ur.user_id = x.user_id and ur.role = 'student'
    group by x.created_at::date
  )
  select d.day_date, coalesce(a.active_count, 0), coalesce(r.completed_count, 0),
    coalesce(r.accuracy_average, 0), coalesce(x.earned_xp, 0)
  from calendar_days d
  left join activity_by_day a on a.day_date = d.day_date
  left join results_by_day r on r.day_date = d.day_date
  left join xp_by_day x on x.day_date = d.day_date
  order by d.day_date;
end;
$$;

create or replace function public.get_admin_weak_topics(p_limit integer default 10)
returns table(level_id text, average_score numeric, error_rate numeric, attempt_count bigint, completion_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select rs.level_id, round(avg(rs.accuracy),1), round(100 - avg(rs.accuracy),1), count(*)::bigint, count(distinct rs.user_id)::bigint
  from public.result_submissions rs join public.user_roles ur on ur.user_id = rs.user_id and ur.role = 'student'
  group by rs.level_id having count(*) > 0
  order by avg(rs.accuracy), count(*) desc limit least(greatest(p_limit,1),50);
end;
$$;

create or replace function public.get_admin_leaderboard(p_period text default 'total', p_section text default null, p_grade smallint default null, p_limit integer default 100, p_offset integer default 0)
returns table(rank bigint, nickname text, avatar text, xp bigint, stars bigint, completed_levels bigint, challenge_points bigint, challenges bigint, average_accuracy numeric, grade smallint, total_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_period not in ('total','week','month') then raise exception 'period_invalid' using errcode = '22023'; end if;
  return query with students as (
    select s.* from public._leaderboard_snapshot(p_period, p_section, p_grade) s
    join public.user_roles ur on ur.user_id = s.user_id and ur.role = 'student'
  )
  select row_number() over(order by s.rank)::bigint, s.nickname, s.avatar, s.xp, s.stars, s.completed_levels,
    s.challenge_points, s.challenges, s.average_accuracy, s.grade, count(*) over()::bigint
  from students s order by s.rank
  limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
end;
$$;

revoke all on function public._handle_new_user_role() from public, anon, authenticated;
revoke all on function public._is_admin(uuid) from public, anon, authenticated;
revoke all on function public._log_profile_activity() from public, anon, authenticated;
revoke all on function public._log_submission_activity() from public, anon, authenticated;
revoke all on function public._log_achievement_activity() from public, anon, authenticated;
revoke all on function public.get_my_role() from public, anon;
revoke all on function public.record_my_activity(text,text) from public, anon;
revoke all on function public.get_admin_dashboard() from public, anon;
revoke all on function public.get_admin_students(text,smallint,text,text,integer,integer) from public, anon;
revoke all on function public.get_admin_student_detail(uuid) from public, anon;
revoke all on function public.get_admin_student_progress(uuid) from public, anon;
revoke all on function public.get_admin_student_history(uuid,integer,integer) from public, anon;
revoke all on function public.get_admin_activity(integer,text,uuid,smallint,text,integer,integer) from public, anon;
revoke all on function public.get_admin_daily_analytics(integer) from public, anon;
revoke all on function public.get_admin_weak_topics(integer) from public, anon;
revoke all on function public.get_admin_leaderboard(text,text,smallint,integer,integer) from public, anon;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.record_my_activity(text,text) to authenticated;
grant execute on function public.get_admin_dashboard() to authenticated;
grant execute on function public.get_admin_students(text,smallint,text,text,integer,integer) to authenticated;
grant execute on function public.get_admin_student_detail(uuid) to authenticated;
grant execute on function public.get_admin_student_progress(uuid) to authenticated;
grant execute on function public.get_admin_student_history(uuid,integer,integer) to authenticated;
grant execute on function public.get_admin_activity(integer,text,uuid,smallint,text,integer,integer) to authenticated;
grant execute on function public.get_admin_daily_analytics(integer) to authenticated;
grant execute on function public.get_admin_weak_topics(integer) to authenticated;
grant execute on function public.get_admin_leaderboard(text,text,smallint,integer,integer) to authenticated;

commit;
