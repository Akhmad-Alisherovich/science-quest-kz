begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  display_name text not null,
  grade smallint check (grade between 1 and 12),
  school text check (school is null or char_length(school) <= 120),
  avatar text not null default '🧑‍🔬' check (avatar in ('🧑‍🔬','🚀','🌍','🧬','⚗️','⚡')),
  show_grade boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_nickname_format check (
    char_length(nickname) between 3 and 20
    and nickname ~ '^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі0-9_-]+$'
  ),
  constraint profile_display_name_length check (char_length(display_name) between 1 and 40)
);

create unique index if not exists profiles_nickname_unique on public.profiles (lower(nickname));
create index if not exists profiles_grade_visible on public.profiles (grade) where show_grade = true;

create table if not exists public.game_levels (
  level_id text primary key,
  section_id text not null check (section_id in ('research','earth','matter','life','energy','ecology')),
  difficulty smallint not null check (difficulty between 1 and 5),
  base_xp integer not null check (base_xp between 0 and 300),
  science_points integer not null check (science_points between 0 and 100),
  challenge_points integer not null default 0 check (challenge_points between 0 and 100),
  unlock_order integer not null unique check (unlock_order between 1 and 98),
  is_boss boolean not null default false
);

with topic_catalog(topic_id, section_id, base_order) as (values
  ('scientific-thinking','research',0), ('hypothesis-variables','research',4), ('measurement-data','research',8),
  ('scales-universe','earth',13), ('solar-system','earth',17), ('earth-system','earth',21), ('map-coordinates','earth',25), ('continents-oceans','earth',29),
  ('atoms-molecules','matter',34), ('states-properties','matter',38), ('changes-mixtures','matter',42), ('acids-materials','matter',46), ('cycles-nonliving','matter',50),
  ('cell','life',55), ('photosynthesis','life',59), ('nutrition-transport','life',63), ('respiration-response','life',67),
  ('energy-transformations','energy',72), ('heat-temperature','energy',76), ('motion-pressure','energy',80),
  ('ecosystem-foodweb','ecology',85), ('ecological-pyramid','ecology',89), ('biodiversity-sustainability','ecology',93)
), stage_catalog(suffix, difficulty, base_xp, science_points, challenge_points, stage_order) as (values
  ('know', 1, 40, 15, 0, 1), ('understand', 2, 55, 20, 0, 2), ('apply', 3, 70, 25, 0, 3), ('challenge', 4, 100, 30, 30, 4)
)
insert into public.game_levels(level_id, section_id, difficulty, base_xp, science_points, challenge_points, unlock_order, is_boss)
select topic_id || '-' || suffix, section_id, difficulty, base_xp, science_points, challenge_points, base_order + stage_order, false
from topic_catalog cross join stage_catalog
on conflict (level_id) do update set
  section_id = excluded.section_id, difficulty = excluded.difficulty, base_xp = excluded.base_xp,
  science_points = excluded.science_points, challenge_points = excluded.challenge_points, unlock_order = excluded.unlock_order, is_boss = false;

insert into public.game_levels(level_id, section_id, difficulty, base_xp, science_points, challenge_points, unlock_order, is_boss) values
  ('boss:research','research',5,250,60,50,13,true), ('boss:earth','earth',5,250,60,50,34,true),
  ('boss:matter','matter',5,250,60,50,55,true), ('boss:life','life',5,250,60,50,72,true),
  ('boss:energy','energy',5,250,60,50,85,true), ('boss:ecology','ecology',5,250,60,50,98,true)
on conflict (level_id) do update set
  section_id = excluded.section_id, difficulty = excluded.difficulty, base_xp = excluded.base_xp,
  science_points = excluded.science_points, challenge_points = excluded.challenge_points, unlock_order = excluded.unlock_order, is_boss = true;

create table if not exists public.student_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  level_id text not null references public.game_levels(level_id),
  completed boolean not null default true,
  best_score smallint not null check (best_score between 0 and 100),
  stars smallint not null check (stars between 1 and 3),
  attempts integer not null default 1 check (attempts > 0),
  mistakes integer not null default 0 check (mistakes >= 0),
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

create index if not exists student_progress_level_user on public.student_progress (level_id, user_id);

create table if not exists public.xp_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level_id text not null references public.game_levels(level_id),
  xp integer not null check (xp between 0 and 320),
  science_points integer not null default 0 check (science_points between 0 and 100),
  challenge_points integer not null default 0 check (challenge_points between 0 and 100),
  reason text not null check (reason in ('level_completion','perfect_bonus')),
  transaction_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, transaction_key)
);

create index if not exists xp_transactions_user_date on public.xp_transactions (user_id, created_at desc);
create index if not exists xp_transactions_period on public.xp_transactions (created_at desc, level_id);
create index if not exists xp_transactions_level_user on public.xp_transactions (level_id, user_id);

create table if not exists public.result_submissions (
  submission_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level_id text not null references public.game_levels(level_id),
  accuracy smallint not null check (accuracy between 0 and 100),
  mistakes integer not null check (mistakes >= 0),
  awarded_xp integer not null check (awarded_xp between 0 and 320),
  created_at timestamptz not null default now(),
  unique (user_id, submission_id)
);

create table if not exists public.achievement_catalog (
  code text primary key,
  title_kk text not null,
  title_ru text not null
);

insert into public.achievement_catalog(code, title_kk, title_ru) values
  ('first-level','Алғашқы қадам','Первый шаг'),
  ('first-experiment','Алғашқы эксперимент','Первый эксперимент'),
  ('first-challenge','Алғашқы ғылыми сынақ','Первый Science Challenge'),
  ('perfect-level','Мінсіз нәтиже','Идеальный результат'),
  ('streak-10','10 мінсіз нәтиже','10 идеальных результатов'),
  ('research-master','Зерттеу шебері','Мастер исследования'),
  ('earth-master','Жер зерттеушісі','Исследователь Земли'),
  ('matter-master','Заттар сарапшысы','Эксперт по веществам'),
  ('life-master','Тіршілік сарапшысы','Эксперт живой природы'),
  ('energy-master','Энергия шебері','Мастер энергии'),
  ('ecology-master','Экология қорғаушысы','Защитник экологии')
on conflict (code) do update set title_kk = excluded.title_kk, title_ru = excluded.title_ru;

create table if not exists public.student_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_code text not null references public.achievement_catalog(code),
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

alter table public.profiles enable row level security;
alter table public.game_levels enable row level security;
alter table public.student_progress enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.result_submissions enable row level security;
alter table public.achievement_catalog enable row level security;
alter table public.student_achievements enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists levels_read_authenticated on public.game_levels;
create policy levels_read_authenticated on public.game_levels for select to authenticated using (true);
drop policy if exists progress_read_own on public.student_progress;
create policy progress_read_own on public.student_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists transactions_read_own on public.xp_transactions;
create policy transactions_read_own on public.xp_transactions for select to authenticated using (user_id = auth.uid());
drop policy if exists submissions_read_own on public.result_submissions;
create policy submissions_read_own on public.result_submissions for select to authenticated using (user_id = auth.uid());
drop policy if exists achievement_catalog_read on public.achievement_catalog;
create policy achievement_catalog_read on public.achievement_catalog for select to authenticated using (true);
drop policy if exists student_achievements_read_own on public.student_achievements;
create policy student_achievements_read_own on public.student_achievements for select to authenticated using (user_id = auth.uid());

revoke all on public.profiles, public.game_levels, public.student_progress, public.xp_transactions, public.result_submissions, public.achievement_catalog, public.student_achievements from anon, authenticated;
grant select on public.profiles, public.game_levels, public.student_progress, public.xp_transactions, public.result_submissions, public.achievement_catalog, public.student_achievements to authenticated;

create or replace function public.save_profile(
  p_nickname text,
  p_display_name text,
  p_grade smallint default null,
  p_school text default null,
  p_avatar text default '🧑‍🔬',
  p_show_grade boolean default false
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_nickname text := btrim(p_nickname);
  v_display_name text := btrim(p_display_name);
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if char_length(v_nickname) not between 3 and 20 or v_nickname !~ '^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі0-9_-]+$' then
    raise exception 'nickname_invalid' using errcode = '22023';
  end if;
  if lower(v_nickname) ~ '(script|admin|moderator|support)' then
    raise exception 'nickname_invalid' using errcode = '22023';
  end if;
  if char_length(v_display_name) not between 1 and 40 then raise exception 'display_name_invalid' using errcode = '22023'; end if;
  if p_grade is not null and p_grade not between 1 and 12 then raise exception 'grade_invalid' using errcode = '22023'; end if;
  if p_avatar not in ('🧑‍🔬','🚀','🌍','🧬','⚗️','⚡') then raise exception 'avatar_invalid' using errcode = '22023'; end if;

  insert into public.profiles(id, nickname, display_name, grade, school, avatar, show_grade)
  values (v_user, v_nickname, v_display_name, p_grade, nullif(btrim(p_school), ''), p_avatar, p_show_grade)
  on conflict (id) do update set
    nickname = excluded.nickname, display_name = excluded.display_name, grade = excluded.grade,
    school = excluded.school, avatar = excluded.avatar, show_grade = excluded.show_grade, updated_at = now();
exception
  when unique_violation then raise exception 'nickname_taken' using errcode = '23505';
end;
$$;

create or replace function public.submit_level_result(
  p_level_id text,
  p_accuracy integer,
  p_mistakes integer,
  p_submission_id uuid
) returns table(awarded_xp integer, total_xp bigint, total_science_points bigint, total_challenge_points bigint, stars smallint, best_score smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_level public.game_levels%rowtype;
  v_progress public.student_progress%rowtype;
  v_first boolean;
  v_stars smallint;
  v_awarded integer := 0;
  v_existing integer;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_user) then raise exception 'profile_required' using errcode = '42501'; end if;
  if p_accuracy not between 0 and 100 or p_mistakes < 0 then raise exception 'result_invalid' using errcode = '22023'; end if;
  select * into v_level from public.game_levels where level_id = p_level_id;
  if not found then raise exception 'unknown_level' using errcode = '22023'; end if;

  -- Serialise retries of the same offline delivery before checking the receipt.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_submission_id::text, 0));
  select rs.awarded_xp into v_existing from public.result_submissions rs where rs.submission_id = p_submission_id and rs.user_id = v_user;
  if found then
    return query select v_existing,
      coalesce(sum(t.xp),0)::bigint, coalesce(sum(t.science_points),0)::bigint, coalesce(sum(t.challenge_points),0)::bigint,
      sp.stars, sp.best_score
    from public.student_progress sp
    left join public.xp_transactions t on t.user_id = sp.user_id
    where sp.user_id = v_user and sp.level_id = p_level_id
    group by sp.stars, sp.best_score;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_level_id, 0));
  v_stars := case when p_accuracy >= 95 then 3 when p_accuracy >= 70 then 2 else 1 end;
  select * into v_progress from public.student_progress where user_id = v_user and level_id = p_level_id for update;
  v_first := not found;

  if v_first and v_level.unlock_order > 1 and not exists (
    select 1 from public.student_progress previous_progress
    join public.game_levels previous_level on previous_level.level_id = previous_progress.level_id
    where previous_progress.user_id = v_user and previous_progress.completed and previous_level.unlock_order = v_level.unlock_order - 1
  ) then
    raise exception 'level_locked' using errcode = '42501';
  end if;

  if v_first then
    insert into public.student_progress(user_id, level_id, best_score, stars, attempts, mistakes)
    values (v_user, p_level_id, p_accuracy, v_stars, 1, p_mistakes);
    insert into public.xp_transactions(user_id, level_id, xp, science_points, challenge_points, reason, transaction_key)
    values (v_user, p_level_id, v_level.base_xp, v_level.science_points, v_level.challenge_points, 'level_completion', p_level_id || ':completion');
    v_awarded := v_level.base_xp;
  else
    update public.student_progress as progress set
      best_score = greatest(progress.best_score, p_accuracy), stars = greatest(progress.stars, v_stars),
      attempts = progress.attempts + 1, mistakes = progress.mistakes + p_mistakes, updated_at = now()
    where progress.user_id = v_user and progress.level_id = p_level_id;
  end if;

  if v_stars = 3 and (v_first or v_progress.stars < 3) then
    insert into public.xp_transactions(user_id, level_id, xp, reason, transaction_key)
    values (v_user, p_level_id, 20, 'perfect_bonus', p_level_id || ':perfect') on conflict (user_id, transaction_key) do nothing;
    v_awarded := v_awarded + 20;
  end if;

  insert into public.result_submissions(submission_id, user_id, level_id, accuracy, mistakes, awarded_xp)
  values (p_submission_id, v_user, p_level_id, p_accuracy, p_mistakes, v_awarded);

  insert into public.student_achievements(user_id, achievement_code) values (v_user, 'first-level') on conflict do nothing;
  if v_level.difficulty = 3 then insert into public.student_achievements(user_id, achievement_code) values (v_user, 'first-experiment') on conflict do nothing; end if;
  if v_level.difficulty = 4 then insert into public.student_achievements(user_id, achievement_code) values (v_user, 'first-challenge') on conflict do nothing; end if;
  if v_stars = 3 then insert into public.student_achievements(user_id, achievement_code) values (v_user, 'perfect-level') on conflict do nothing; end if;
  if v_level.is_boss then insert into public.student_achievements(user_id, achievement_code) values (v_user, v_level.section_id || '-master') on conflict do nothing; end if;
  if (select count(*) = 10 and bool_and(mistakes = 0) from (select mistakes from public.result_submissions where user_id = v_user order by created_at desc limit 10) recent) then
    insert into public.student_achievements(user_id, achievement_code) values (v_user, 'streak-10') on conflict do nothing;
  end if;

  return query select v_awarded,
    coalesce(sum(t.xp),0)::bigint, coalesce(sum(t.science_points),0)::bigint, coalesce(sum(t.challenge_points),0)::bigint,
    sp.stars, sp.best_score
  from public.student_progress sp
  left join public.xp_transactions t on t.user_id = sp.user_id
  where sp.user_id = v_user and sp.level_id = p_level_id
  group by sp.stars, sp.best_score;
end;
$$;

create or replace function public._leaderboard_period_start(p_period text)
returns timestamptz
language sql stable
set search_path = ''
as $$
  select case p_period
    when 'week' then date_trunc('week', now() at time zone 'Asia/Almaty') at time zone 'Asia/Almaty'
    when 'month' then date_trunc('month', now() at time zone 'Asia/Almaty') at time zone 'Asia/Almaty'
    else null
  end;
$$;

revoke all on function public._leaderboard_period_start(text) from public, anon, authenticated;

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
    select p.id user_id, p.nickname, p.avatar, coalesce(tx.xp,0)::bigint xp,
      coalesce(pr.stars,0)::bigint stars, coalesce(pr.completed_levels,0)::bigint completed_levels,
      coalesce(tx.challenge_points,0)::bigint challenge_points, coalesce(pr.challenges,0)::bigint challenges,
      coalesce(pr.average_accuracy,0)::numeric average_accuracy, case when p.show_grade then p.grade else null end grade, tx.reached_at
    from public.profiles p left join tx on tx.user_id = p.id left join progress pr on pr.user_id = p.id
    where (p_grade is null or (p.grade = p_grade and p.show_grade))
      and (p_period = 'total' or tx.user_id is not null)
  )
  select row_number() over (order by xp desc, stars desc, challenges desc, average_accuracy desc, reached_at asc nulls last, lower(nickname) asc)::bigint,
    user_id, nickname, avatar, xp, stars, completed_levels, challenge_points, challenges, average_accuracy, grade, reached_at,
    count(*) over ()::bigint
  from base;
$$;

revoke all on function public._leaderboard_snapshot(text,text,smallint) from public, anon, authenticated;

create or replace function public.get_leaderboard(p_period text default 'total', p_section text default null, p_grade smallint default null, p_limit integer default 50, p_offset integer default 0)
returns table(rank bigint, nickname text, avatar text, xp bigint, stars bigint, completed_levels bigint, challenge_points bigint, challenges bigint, average_accuracy numeric, grade smallint, is_current boolean, total_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_period not in ('total','week','month') then raise exception 'period_invalid' using errcode = '22023'; end if;
  return query select s.rank, s.nickname, s.avatar, s.xp, s.stars, s.completed_levels, s.challenge_points, s.challenges,
    s.average_accuracy, s.grade, s.user_id = auth.uid(), s.total_count
  from public._leaderboard_snapshot(p_period, p_section, p_grade) s order by s.rank
  limit least(greatest(p_limit,1),50) offset greatest(p_offset,0);
end;
$$;

create or replace function public.get_my_rank(p_period text default 'total', p_section text default null, p_grade smallint default null)
returns table(rank bigint, nickname text, avatar text, xp bigint, stars bigint, completed_levels bigint, challenge_points bigint, challenges bigint, average_accuracy numeric, grade smallint, is_current boolean, total_count bigint, xp_to_next bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_period not in ('total','week','month') then raise exception 'period_invalid' using errcode = '22023'; end if;
  return query with snapshot as (select * from public._leaderboard_snapshot(p_period, p_section, p_grade)), me as (select * from snapshot where user_id = auth.uid())
    select me.rank, me.nickname, me.avatar, me.xp, me.stars, me.completed_levels, me.challenge_points, me.challenges,
      me.average_accuracy, me.grade, true, me.total_count, greatest(coalesce(ahead.xp, me.xp) - me.xp, 0)::bigint
    from me left join snapshot ahead on ahead.rank = me.rank - 1;
end;
$$;

create or replace function public.get_nearby_leaderboard(p_period text default 'total')
returns table(rank bigint, nickname text, avatar text, xp bigint, stars bigint, completed_levels bigint, challenge_points bigint, challenges bigint, average_accuracy numeric, grade smallint, is_current boolean, total_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_period not in ('total','week','month') then raise exception 'period_invalid' using errcode = '22023'; end if;
  return query with snapshot as (select * from public._leaderboard_snapshot(p_period, null, null)), me as (select current_row.rank from snapshot current_row where current_row.user_id = auth.uid())
    select s.rank, s.nickname, s.avatar, s.xp, s.stars, s.completed_levels, s.challenge_points, s.challenges,
      s.average_accuracy, s.grade, s.user_id = auth.uid(), s.total_count
    from snapshot s cross join me where s.rank between greatest(me.rank - 3, 1) and me.rank + 3 order by s.rank;
end;
$$;

create or replace function public.check_leaderboard_health()
returns table(ok boolean, schema_version text, level_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return query select true, '202608220001', count(*)::bigint from public.game_levels;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.save_profile(text,text,smallint,text,text,boolean) from public, anon;
revoke all on function public.submit_level_result(text,integer,integer,uuid) from public, anon;
revoke all on function public.get_leaderboard(text,text,smallint,integer,integer) from public, anon;
revoke all on function public.get_my_rank(text,text,smallint) from public, anon;
revoke all on function public.get_nearby_leaderboard(text) from public, anon;
revoke all on function public.check_leaderboard_health() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.save_profile(text,text,smallint,text,text,boolean) to authenticated;
grant execute on function public.submit_level_result(text,integer,integer,uuid) to authenticated;
grant execute on function public.get_leaderboard(text,text,smallint,integer,integer) to authenticated;
grant execute on function public.get_my_rank(text,text,smallint) to authenticated;
grant execute on function public.get_nearby_leaderboard(text) to authenticated;
grant execute on function public.check_leaderboard_health() to authenticated;
grant execute on function public.delete_my_account() to authenticated;

commit;
