begin;

create table if not exists public.learning_content_catalog (
  content_type text not null check (content_type in ('section','topic','level','boss')),
  content_id text not null,
  parent_id text,
  section_id text not null check (section_id in ('research','earth','matter','life','energy','ecology')),
  sort_order integer not null,
  primary key (content_type, content_id)
);

insert into public.learning_content_catalog(content_type, content_id, parent_id, section_id, sort_order) values
  ('section','research',null,'research',1), ('section','earth',null,'earth',2),
  ('section','matter',null,'matter',3), ('section','life',null,'life',4),
  ('section','energy',null,'energy',5), ('section','ecology',null,'ecology',6)
on conflict (content_type, content_id) do update set parent_id = excluded.parent_id, section_id = excluded.section_id, sort_order = excluded.sort_order;

with topic_catalog(topic_id, section_id, topic_order) as (values
  ('scientific-thinking','research',1), ('hypothesis-variables','research',2), ('measurement-data','research',3),
  ('scales-universe','earth',4), ('solar-system','earth',5), ('earth-system','earth',6), ('map-coordinates','earth',7), ('continents-oceans','earth',8),
  ('atoms-molecules','matter',9), ('states-properties','matter',10), ('changes-mixtures','matter',11), ('acids-materials','matter',12), ('cycles-nonliving','matter',13),
  ('cell','life',14), ('photosynthesis','life',15), ('nutrition-transport','life',16), ('respiration-response','life',17),
  ('energy-transformations','energy',18), ('heat-temperature','energy',19), ('motion-pressure','energy',20),
  ('ecosystem-foodweb','ecology',21), ('ecological-pyramid','ecology',22), ('biodiversity-sustainability','ecology',23)
)
insert into public.learning_content_catalog(content_type, content_id, parent_id, section_id, sort_order)
select 'topic', topic_id, section_id, section_id, topic_order * 10 from topic_catalog
on conflict (content_type, content_id) do update set parent_id = excluded.parent_id, section_id = excluded.section_id, sort_order = excluded.sort_order;

insert into public.learning_content_catalog(content_type, content_id, parent_id, section_id, sort_order)
select case when gl.is_boss then 'boss' else 'level' end,
  gl.level_id,
  case when gl.is_boss then gl.section_id else regexp_replace(gl.level_id, '-(know|understand|apply|challenge)$', '') end,
  gl.section_id,
  gl.unlock_order
from public.game_levels gl
on conflict (content_type, content_id) do update set parent_id = excluded.parent_id, section_id = excluded.section_id, sort_order = excluded.sort_order;

create table if not exists public.content_access_rules (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('user','grade','all')),
  target_value text not null,
  content_type text not null,
  content_id text not null,
  access_state text not null check (access_state in ('open','locked','hidden','assigned')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_type, target_value, content_type, content_id),
  foreign key (content_type, content_id) references public.learning_content_catalog(content_type, content_id)
);

create index if not exists content_access_rules_target on public.content_access_rules(target_type, target_value);
create index if not exists content_access_rules_content on public.content_access_rules(content_type, content_id);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title_kk text not null check (char_length(title_kk) between 1 and 120),
  title_ru text not null check (char_length(title_ru) between 1 and 120),
  description_kk text not null default '' check (char_length(description_kk) <= 1000),
  description_ru text not null default '' check (char_length(description_ru) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  available_from timestamptz not null default now(),
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('normal','priority')),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_at is null or due_at > available_from)
);

create table if not exists public.assignment_targets (
  id bigint generated always as identity primary key,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  target_type text not null check (target_type in ('user','grade','all')),
  target_value text not null,
  created_at timestamptz not null default now(),
  unique (assignment_id, target_type, target_value)
);

create table if not exists public.assignment_items (
  id bigint generated always as identity primary key,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  content_type text not null,
  content_id text not null,
  sort_order integer not null default 0,
  unique (assignment_id, content_type, content_id),
  foreign key (content_type, content_id) references public.learning_content_catalog(content_type, content_id)
);

create table if not exists public.student_assignment_progress (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  progress_percent numeric(5,1) not null default 0 check (progress_percent between 0 and 100),
  completed_items integer not null default 0 check (completed_items >= 0),
  total_items integer not null default 0 check (total_items >= 0),
  best_score numeric(5,1) not null default 0 check (best_score between 0 and 100),
  stars bigint not null default 0 check (stars >= 0),
  attempts bigint not null default 0 check (attempts >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, user_id)
);

create index if not exists assignments_active_due on public.assignments(status, due_at) where status = 'active';
create index if not exists assignment_targets_lookup on public.assignment_targets(target_type, target_value, assignment_id);
create index if not exists assignment_items_content on public.assignment_items(content_type, content_id, assignment_id);
create index if not exists assignment_progress_user on public.student_assignment_progress(user_id, status, updated_at desc);

create table if not exists public.admin_learning_audit (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('ADMIN_ASSIGNMENT_CREATED','ADMIN_ASSIGNMENT_UPDATED','ADMIN_CONTENT_OPENED','ADMIN_CONTENT_LOCKED','ADMIN_CONTENT_HIDDEN','ADMIN_CONTENT_ASSIGNED')),
  target_type text,
  target_value text,
  content_type text,
  content_id text,
  assignment_id uuid references public.assignments(id) on delete set null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists admin_learning_audit_date on public.admin_learning_audit(created_at desc);
create index if not exists admin_learning_audit_admin on public.admin_learning_audit(admin_id, created_at desc);

alter table public.learning_content_catalog enable row level security;
alter table public.content_access_rules enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_targets enable row level security;
alter table public.assignment_items enable row level security;
alter table public.student_assignment_progress enable row level security;
alter table public.admin_learning_audit enable row level security;

drop policy if exists learning_catalog_read_authenticated on public.learning_content_catalog;
create policy learning_catalog_read_authenticated on public.learning_content_catalog for select to authenticated using (true);
drop policy if exists content_rules_read_relevant on public.content_access_rules;
create policy content_rules_read_relevant on public.content_access_rules for select to authenticated using (
  target_type = 'all' or
  (target_type = 'user' and target_value = auth.uid()::text) or
  (target_type = 'grade' and target_value = coalesce((select p.grade::text from public.profiles p where p.id = auth.uid()), ''))
);
drop policy if exists assignments_read_relevant on public.assignments;
create policy assignments_read_relevant on public.assignments for select to authenticated using (
  exists (select 1 from public.student_assignment_progress sap where sap.assignment_id = public.assignments.id and sap.user_id = auth.uid())
);
drop policy if exists assignment_items_read_relevant on public.assignment_items;
create policy assignment_items_read_relevant on public.assignment_items for select to authenticated using (
  exists (select 1 from public.student_assignment_progress sap where sap.assignment_id = public.assignment_items.assignment_id and sap.user_id = auth.uid())
);
drop policy if exists assignment_progress_read_own on public.student_assignment_progress;
create policy assignment_progress_read_own on public.student_assignment_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists learning_audit_read_admin on public.admin_learning_audit;
create policy learning_audit_read_admin on public.admin_learning_audit for select to authenticated using (false);

revoke all on public.learning_content_catalog, public.content_access_rules, public.assignments, public.assignment_targets, public.assignment_items, public.student_assignment_progress, public.admin_learning_audit from anon, authenticated;
grant select on public.learning_content_catalog, public.content_access_rules, public.assignments, public.assignment_items, public.student_assignment_progress, public.admin_learning_audit to authenticated;

create or replace function public._learning_target_matches(p_user uuid, p_target_type text, p_target_value text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_target_type = 'all'
    or (p_target_type = 'user' and p_target_value = p_user::text)
    or (p_target_type = 'grade' and exists(select 1 from public.profiles p where p.id = p_user and p.grade::text = p_target_value));
$$;

create or replace function public._validate_learning_target(p_target_type text, p_target_value text)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_target_type not in ('user','grade','all') then raise exception 'target_type_invalid' using errcode = '22023'; end if;
  if p_target_type = 'all' and p_target_value <> 'all' then raise exception 'target_invalid' using errcode = '22023'; end if;
  if p_target_type = 'grade' and (p_target_value !~ '^[1-9][0-2]?$' or p_target_value::integer not between 1 and 12) then raise exception 'grade_invalid' using errcode = '22023'; end if;
  if p_target_type = 'user' and not exists(
    select 1 from public.profiles p join public.user_roles ur on ur.user_id = p.id and ur.role = 'student' where p.id = p_target_value::uuid
  ) then raise exception 'student_not_found' using errcode = '22023'; end if;
exception when invalid_text_representation then raise exception 'target_invalid' using errcode = '22023';
end;
$$;

create or replace function public._assignment_level_ids(p_assignment_id uuid)
returns table(level_id text)
language sql stable security definer set search_path = ''
as $$
  select distinct gl.level_id
  from public.assignment_items ai
  join public.learning_content_catalog item on item.content_type = ai.content_type and item.content_id = ai.content_id
  join public.game_levels gl on
    (ai.content_type in ('level','boss') and gl.level_id = ai.content_id) or
    (ai.content_type = 'topic' and not gl.is_boss and regexp_replace(gl.level_id, '-(know|understand|apply|challenge)$', '') = ai.content_id) or
    (ai.content_type = 'section' and gl.section_id = ai.content_id)
  where ai.assignment_id = p_assignment_id;
$$;

create or replace function public._refresh_assignment_progress(p_assignment_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_total integer; v_done integer; v_score numeric; v_stars bigint; v_attempts bigint; v_old_status text;
begin
  select count(*)::integer into v_total from public._assignment_level_ids(p_assignment_id);
  select count(sp.level_id)::integer, coalesce(max(sp.best_score),0), coalesce(sum(sp.stars),0), coalesce(sum(sp.attempts),0)
    into v_done, v_score, v_stars, v_attempts
  from public._assignment_level_ids(p_assignment_id) required
  left join public.student_progress sp on sp.level_id = required.level_id and sp.user_id = p_user_id and sp.completed;
  select sap.status into v_old_status from public.student_assignment_progress sap where sap.assignment_id = p_assignment_id and sap.user_id = p_user_id;
  insert into public.student_assignment_progress(assignment_id,user_id,status,progress_percent,completed_items,total_items,best_score,stars,attempts,started_at,completed_at)
  values (p_assignment_id,p_user_id,
    case when v_total > 0 and v_done = v_total then 'completed' when v_done > 0 then 'in_progress' else 'not_started' end,
    case when v_total = 0 then 0 else round(v_done::numeric / v_total * 100,1) end,
    v_done,v_total,v_score,v_stars,v_attempts,
    case when v_done > 0 then now() else null end,
    case when v_total > 0 and v_done = v_total then now() else null end)
  on conflict (assignment_id,user_id) do update set
    status = excluded.status, progress_percent = excluded.progress_percent, completed_items = excluded.completed_items,
    total_items = excluded.total_items, best_score = excluded.best_score, stars = excluded.stars, attempts = excluded.attempts,
    started_at = coalesce(public.student_assignment_progress.started_at, excluded.started_at),
    completed_at = case when excluded.status = 'completed' then coalesce(public.student_assignment_progress.completed_at, excluded.completed_at) else null end,
    updated_at = now();
end;
$$;

create or replace function public._attach_learning_assignments()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare assignment_row record;
begin
  for assignment_row in
    select distinct a.id from public.assignments a join public.assignment_targets at on at.assignment_id = a.id
    where a.status = 'active' and public._learning_target_matches(new.id, at.target_type, at.target_value)
  loop
    perform public._refresh_assignment_progress(assignment_row.id, new.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists profile_attach_learning_assignments on public.profiles;
create trigger profile_attach_learning_assignments after insert or update of grade on public.profiles
for each row execute function public._attach_learning_assignments();

create or replace function public._refresh_learning_assignments_after_progress()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare assignment_row record;
begin
  for assignment_row in
    select distinct sap.assignment_id from public.student_assignment_progress sap
    join public.assignment_items ai on ai.assignment_id = sap.assignment_id
    join public.learning_content_catalog item on item.content_type = ai.content_type and item.content_id = ai.content_id
    join public.game_levels gl on gl.level_id = new.level_id
    where sap.user_id = new.user_id and (
      (ai.content_type in ('level','boss') and ai.content_id = new.level_id) or
      (ai.content_type = 'topic' and item.content_id = regexp_replace(new.level_id, '-(know|understand|apply|challenge)$', '')) or
      (ai.content_type = 'section' and item.content_id = gl.section_id)
    )
  loop
    perform public._refresh_assignment_progress(assignment_row.assignment_id, new.user_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists progress_refresh_learning_assignments on public.student_progress;
create trigger progress_refresh_learning_assignments after insert or update on public.student_progress
for each row execute function public._refresh_learning_assignments_after_progress();

create or replace function public._mark_learning_assignment_started()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.event_type = 'LEVEL_STARTED' and new.level_id is not null then
    update public.student_assignment_progress sap set status = 'in_progress', started_at = coalesce(sap.started_at, new.created_at), updated_at = now()
    where sap.user_id = new.user_id and sap.status = 'not_started' and exists(
      select 1 from public.assignment_items ai
      join public.game_levels gl on gl.level_id = new.level_id
      where ai.assignment_id = sap.assignment_id and (
        (ai.content_type in ('level','boss') and ai.content_id = new.level_id) or
        (ai.content_type = 'topic' and ai.content_id = regexp_replace(new.level_id, '-(know|understand|apply|challenge)$', '')) or
        (ai.content_type = 'section' and ai.content_id = gl.section_id)
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists activity_start_learning_assignments on public.student_activity;
create trigger activity_start_learning_assignments after insert on public.student_activity
for each row execute function public._mark_learning_assignment_started();

create or replace function public._find_learning_assignment(p_user uuid, p_content_type text, p_content_id text)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select a.id
  from public.assignments a
  join public.student_assignment_progress sap on sap.assignment_id = a.id and sap.user_id = p_user
  join public.assignment_items ai on ai.assignment_id = a.id
  join public.learning_content_catalog requested on requested.content_type = p_content_type and requested.content_id = p_content_id
  where a.status = 'active' and a.available_from <= now() and (a.due_at is null or a.due_at >= now()) and (
    (ai.content_type = p_content_type and ai.content_id = p_content_id) or
    (ai.content_type = 'section' and ai.content_id = requested.section_id) or
    (ai.content_type = 'topic' and (ai.content_id = requested.parent_id or (p_content_type = 'topic' and ai.content_id = p_content_id)))
  )
  order by (a.priority = 'priority') desc, a.due_at asc nulls last, a.created_at desc limit 1;
$$;

create or replace function public._resolve_learning_rule(p_user uuid, p_content_type text, p_content_id text)
returns text
language sql stable security definer set search_path = ''
as $$
  select r.access_state
  from public.content_access_rules r
  join public.learning_content_catalog requested on requested.content_type = p_content_type and requested.content_id = p_content_id
  where public._learning_target_matches(p_user, r.target_type, r.target_value) and (
    (r.content_type = p_content_type and r.content_id = p_content_id) or
    (r.content_type = 'section' and r.content_id = requested.section_id) or
    (r.content_type = 'topic' and (r.content_id = requested.parent_id or (p_content_type = 'topic' and r.content_id = p_content_id)))
  )
  order by
    case when r.content_type = p_content_type and r.content_id = p_content_id then 30 when r.content_type = 'topic' then 20 else 10 end desc,
    case r.target_type when 'user' then 30 when 'grade' then 20 else 10 end desc,
    r.updated_at desc limit 1;
$$;

create or replace function public._learning_content_completed(p_user uuid, p_content_type text, p_content_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_content_type in ('level','boss') then exists(select 1 from public.student_progress sp where sp.user_id = p_user and sp.level_id = p_content_id and sp.completed)
    when p_content_type = 'topic' then not exists(
      select 1 from public.game_levels gl where not gl.is_boss and regexp_replace(gl.level_id, '-(know|understand|apply|challenge)$', '') = p_content_id
      and not exists(select 1 from public.student_progress sp where sp.user_id = p_user and sp.level_id = gl.level_id and sp.completed)
    )
    when p_content_type = 'section' then not exists(
      select 1 from public.game_levels gl where gl.section_id = p_content_id
      and not exists(select 1 from public.student_progress sp where sp.user_id = p_user and sp.level_id = gl.level_id and sp.completed)
    ) else false end;
$$;

create or replace function public._normal_learning_access(p_user uuid, p_content_type text, p_content_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_content_type in ('level','boss') then exists(
      select 1 from public.game_levels gl where gl.level_id = p_content_id and (
        gl.unlock_order = 1 or exists(
          select 1 from public.game_levels previous_level
          join public.student_progress previous_progress on previous_progress.level_id = previous_level.level_id
          where previous_level.unlock_order = gl.unlock_order - 1 and previous_progress.user_id = p_user and previous_progress.completed
        )
      )
    )
    when p_content_type = 'topic' then exists(
      select 1 from public.game_levels gl where not gl.is_boss and regexp_replace(gl.level_id, '-(know|understand|apply|challenge)$', '') = p_content_id and (
        gl.unlock_order = 1 or exists(select 1 from public.game_levels previous_level join public.student_progress previous_progress on previous_progress.level_id=previous_level.level_id where previous_level.unlock_order=gl.unlock_order-1 and previous_progress.user_id=p_user and previous_progress.completed)
      )
    )
    when p_content_type = 'section' then exists(
      select 1 from public.game_levels gl where gl.section_id = p_content_id and (
        gl.unlock_order = 1 or exists(select 1 from public.game_levels previous_level join public.student_progress previous_progress on previous_progress.level_id=previous_level.level_id where previous_level.unlock_order=gl.unlock_order-1 and previous_progress.user_id=p_user and previous_progress.completed)
      )
    ) else false end;
$$;

create or replace function public._effective_learning_access(p_user uuid, p_content_type text, p_content_id text)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare v_rule text; v_assignment uuid;
begin
  select public._resolve_learning_rule(p_user,p_content_type,p_content_id) into v_rule;
  if v_rule is not null then return v_rule; end if;
  select public._find_learning_assignment(p_user,p_content_type,p_content_id) into v_assignment;
  if v_assignment is not null then return 'assigned'; end if;
  if public._learning_content_completed(p_user,p_content_type,p_content_id) then return 'completed'; end if;
  if public._normal_learning_access(p_user,p_content_type,p_content_id) then return 'open'; end if;
  return 'locked';
end;
$$;

create or replace function public.get_my_content_access()
returns table(content_type text, content_id text, access_state text, access_source text, assignment_id uuid)
language plpgsql stable security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return query select c.content_type, c.content_id,
    public._effective_learning_access(v_user,c.content_type,c.content_id),
    case when public._resolve_learning_rule(v_user,c.content_type,c.content_id) is not null then 'admin'
      when public._find_learning_assignment(v_user,c.content_type,c.content_id) is not null then 'assignment'
      when public._learning_content_completed(v_user,c.content_type,c.content_id) then 'progress' else 'normal' end,
    public._find_learning_assignment(v_user,c.content_type,c.content_id)
  from public.learning_content_catalog c order by c.sort_order, c.content_type;
end;
$$;

create or replace function public.get_my_assignments()
returns table(assignment_id uuid, title_kk text, title_ru text, description_kk text, description_ru text, available_from timestamptz, due_at timestamptz, priority text, status text, progress_percent numeric, completed_items integer, total_items integer, best_score numeric, stars bigint, attempts bigint, completed_at timestamptz, item_type text, item_id text)
language plpgsql stable security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return query select a.id,a.title_kk,a.title_ru,a.description_kk,a.description_ru,a.available_from,a.due_at,a.priority,
    case when sap.status <> 'completed' and a.due_at is not null and a.due_at < now() then 'overdue' else sap.status end,
    sap.progress_percent,sap.completed_items,sap.total_items,sap.best_score,sap.stars,sap.attempts,sap.completed_at,
    first_item.content_type,first_item.content_id
  from public.assignments a join public.student_assignment_progress sap on sap.assignment_id = a.id and sap.user_id = v_user
  left join lateral (select ai.content_type,ai.content_id from public.assignment_items ai where ai.assignment_id = a.id order by ai.sort_order,ai.id limit 1) first_item on true
  where a.status = 'active' order by (a.priority = 'priority') desc, (sap.status = 'completed'), a.due_at asc nulls last, a.created_at desc;
end;
$$;

create or replace function public.admin_set_content_access(p_target_type text, p_target_value text, p_content_type text, p_content_id text, p_access_state text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := auth.uid(); v_action text;
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  perform public._validate_learning_target(p_target_type,p_target_value);
  if p_access_state not in ('open','locked','hidden','assigned') then raise exception 'access_state_invalid' using errcode = '22023'; end if;
  if not exists(select 1 from public.learning_content_catalog c where c.content_type=p_content_type and c.content_id=p_content_id) then raise exception 'content_not_found' using errcode = '22023'; end if;
  insert into public.content_access_rules(target_type,target_value,content_type,content_id,access_state,assigned_by)
  values(p_target_type,p_target_value,p_content_type,p_content_id,p_access_state,v_admin)
  on conflict(target_type,target_value,content_type,content_id) do update set access_state=excluded.access_state,assigned_by=excluded.assigned_by,updated_at=now();
  v_action := case p_access_state when 'open' then 'ADMIN_CONTENT_OPENED' when 'locked' then 'ADMIN_CONTENT_LOCKED' when 'hidden' then 'ADMIN_CONTENT_HIDDEN' else 'ADMIN_CONTENT_ASSIGNED' end;
  insert into public.admin_learning_audit(admin_id,action,target_type,target_value,content_type,content_id)
  values(v_admin,v_action,p_target_type,p_target_value,p_content_type,p_content_id);
end;
$$;

create or replace function public.admin_clear_content_access(p_target_type text, p_target_value text, p_content_type text, p_content_id text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  perform public._validate_learning_target(p_target_type,p_target_value);
  delete from public.content_access_rules r where r.target_type=p_target_type and r.target_value=p_target_value and r.content_type=p_content_type and r.content_id=p_content_id;
end;
$$;

create or replace function public.admin_create_assignment(p_title_kk text,p_title_ru text,p_description_kk text,p_description_ru text,p_available_from timestamptz,p_due_at timestamptz,p_priority text,p_target_type text,p_target_values text[],p_item_types text[],p_item_ids text[])
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid:=auth.uid(); v_assignment uuid; v_index integer; v_user record; v_target_value text;
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if btrim(p_title_kk)='' or btrim(p_title_ru)='' then raise exception 'title_required' using errcode='22023'; end if;
  if p_priority not in ('normal','priority') then raise exception 'priority_invalid' using errcode='22023'; end if;
  if p_due_at is not null and p_due_at <= coalesce(p_available_from,now()) then raise exception 'due_date_invalid' using errcode='22023'; end if;
  if coalesce(array_length(p_target_values,1),0)=0 or coalesce(array_length(p_item_ids,1),0)=0 or array_length(p_item_types,1)<>array_length(p_item_ids,1) then raise exception 'assignment_items_required' using errcode='22023'; end if;
  foreach v_target_value in array p_target_values loop perform public._validate_learning_target(p_target_type,v_target_value); end loop;
  for v_index in 1..array_length(p_item_ids,1) loop
    if not exists(select 1 from public.learning_content_catalog c where c.content_type=p_item_types[v_index] and c.content_id=p_item_ids[v_index]) then raise exception 'content_not_found:%',p_item_ids[v_index] using errcode='22023'; end if;
  end loop;
  insert into public.assignments(title_kk,title_ru,description_kk,description_ru,created_by,available_from,due_at,priority)
  values(btrim(p_title_kk),btrim(p_title_ru),coalesce(p_description_kk,''),coalesce(p_description_ru,''),v_admin,coalesce(p_available_from,now()),p_due_at,p_priority) returning id into v_assignment;
  foreach v_target_value in array p_target_values loop insert into public.assignment_targets(assignment_id,target_type,target_value) values(v_assignment,p_target_type,v_target_value); end loop;
  for v_index in 1..array_length(p_item_ids,1) loop insert into public.assignment_items(assignment_id,content_type,content_id,sort_order) values(v_assignment,p_item_types[v_index],p_item_ids[v_index],v_index); end loop;
  for v_user in
    select p.id from public.profiles p join public.user_roles ur on ur.user_id=p.id and ur.role='student'
    where exists(select 1 from public.assignment_targets at where at.assignment_id=v_assignment and public._learning_target_matches(p.id,at.target_type,at.target_value))
  loop perform public._refresh_assignment_progress(v_assignment,v_user.id); end loop;
  insert into public.admin_learning_audit(admin_id,action,target_type,target_value,assignment_id,details)
  values(v_admin,'ADMIN_ASSIGNMENT_CREATED',p_target_type,array_to_string(p_target_values,','),v_assignment,jsonb_build_object('items',array_length(p_item_ids,1),'priority',p_priority));
  return v_assignment;
end;
$$;

create or replace function public.admin_update_assignment(p_assignment_id uuid,p_title_kk text,p_title_ru text,p_description_kk text,p_description_ru text,p_available_from timestamptz,p_due_at timestamptz,p_priority text,p_status text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_priority not in ('normal','priority') or p_status not in ('active','archived') then raise exception 'assignment_state_invalid' using errcode='22023'; end if;
  if p_due_at is not null and p_due_at <= p_available_from then raise exception 'due_date_invalid' using errcode='22023'; end if;
  update public.assignments a set title_kk=btrim(p_title_kk),title_ru=btrim(p_title_ru),description_kk=coalesce(p_description_kk,''),description_ru=coalesce(p_description_ru,''),available_from=p_available_from,due_at=p_due_at,priority=p_priority,status=p_status,updated_at=now() where a.id=p_assignment_id;
  if not found then raise exception 'assignment_not_found' using errcode='22023'; end if;
  insert into public.admin_learning_audit(admin_id,action,assignment_id,details) values(auth.uid(),'ADMIN_ASSIGNMENT_UPDATED',p_assignment_id,jsonb_build_object('status',p_status,'priority',p_priority));
end;
$$;

create or replace function public.admin_get_assignments(p_status text default null,p_limit integer default 50,p_offset integer default 0)
returns table(assignment_id uuid,title_kk text,title_ru text,description_kk text,description_ru text,available_from timestamptz,due_at timestamptz,priority text,status text,target_summary text,item_count bigint,assigned_count bigint,started_count bigint,completed_count bigint,average_score numeric,average_attempts numeric,total_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  return query with base as (
    select a.id,a.title_kk,a.title_ru,a.description_kk,a.description_ru,a.available_from,a.due_at,a.priority,a.status,
      (select string_agg(at.target_type||':'||at.target_value,', ' order by at.id) from public.assignment_targets at where at.assignment_id=a.id) targets,
      (select count(*) from public.assignment_items ai where ai.assignment_id=a.id)::bigint items,
      count(sap.user_id)::bigint assigned,count(*) filter(where sap.status in ('in_progress','completed'))::bigint started,count(*) filter(where sap.status='completed')::bigint completed,
      coalesce(round(avg(sap.best_score),1),0) score,coalesce(round(avg(sap.attempts),1),0) attempts
    from public.assignments a left join public.student_assignment_progress sap on sap.assignment_id=a.id
    where p_status is null or a.status=p_status group by a.id
  ) select b.*,count(*) over()::bigint from base b order by (b.priority='priority') desc,b.due_at asc nulls last,b.assignment_id
  limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
end;
$$;

create or replace function public.admin_get_student_assignments(p_user_id uuid)
returns table(assignment_id uuid,title_kk text,title_ru text,due_at timestamptz,priority text,status text,progress_percent numeric,best_score numeric,stars bigint,attempts bigint,completed_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  return query select a.id,a.title_kk,a.title_ru,a.due_at,a.priority,
    case when sap.status<>'completed' and a.due_at is not null and a.due_at<now() then 'overdue' else sap.status end,
    sap.progress_percent,sap.best_score,sap.stars,sap.attempts,sap.completed_at
  from public.student_assignment_progress sap join public.assignments a on a.id=sap.assignment_id where sap.user_id=p_user_id order by a.created_at desc;
end;
$$;

create or replace function public.admin_get_student_access(p_user_id uuid)
returns table(content_type text,content_id text,access_state text,access_source text,assignment_id uuid)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p where p.id=p_user_id) then raise exception 'student_not_found' using errcode='22023'; end if;
  return query select c.content_type,c.content_id,public._effective_learning_access(p_user_id,c.content_type,c.content_id),
    case when public._resolve_learning_rule(p_user_id,c.content_type,c.content_id) is not null then 'admin' when public._find_learning_assignment(p_user_id,c.content_type,c.content_id) is not null then 'assignment' when public._learning_content_completed(p_user_id,c.content_type,c.content_id) then 'progress' else 'normal' end,
    public._find_learning_assignment(p_user_id,c.content_type,c.content_id)
  from public.learning_content_catalog c order by c.sort_order,c.content_type;
end;
$$;

create or replace function public.admin_get_content_overview()
returns table(content_type text,content_id text,section_id text,completed_students bigint,average_score numeric,error_rate numeric,average_attempts numeric,assigned_students bigint,access_overrides bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  return query select c.content_type,c.content_id,c.section_id,
    count(distinct sp.user_id)::bigint,coalesce(round(avg(sp.best_score),1),0),coalesce(round(100-avg(sp.best_score),1),0),coalesce(round(avg(sp.attempts),1),0),
    (select count(distinct sap.user_id) from public.assignment_items ai join public.student_assignment_progress sap on sap.assignment_id=ai.assignment_id where (ai.content_type=c.content_type and ai.content_id=c.content_id) or (ai.content_type='section' and ai.content_id=c.section_id) or (ai.content_type='topic' and ai.content_id=c.parent_id))::bigint,
    (select count(*) from public.content_access_rules r where (r.content_type=c.content_type and r.content_id=c.content_id) or (r.content_type='section' and r.content_id=c.section_id) or (r.content_type='topic' and r.content_id=c.parent_id))::bigint
  from public.learning_content_catalog c left join public.game_levels gl on
    (c.content_type in ('level','boss') and gl.level_id=c.content_id) or
    (c.content_type='topic' and not gl.is_boss and regexp_replace(gl.level_id, '-(know|understand|apply|challenge)$', '')=c.content_id) or
    (c.content_type='section' and gl.section_id=c.content_id)
  left join public.student_progress sp on sp.level_id=gl.level_id
  group by c.content_type,c.content_id,c.section_id,c.parent_id,c.sort_order order by c.sort_order,c.content_type;
end;
$$;

create or replace function public.admin_get_learning_dashboard()
returns table(active_assignments bigint,completed_assignments bigint,average_assignment_progress numeric,recent_players bigint,overdue_students bigint,high_attempt_students bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  return query select
    (select count(*) from public.assignments a where a.status='active')::bigint,
    (select count(*) from public.student_assignment_progress sap where sap.status='completed')::bigint,
    coalesce((select round(avg(sap.progress_percent),1) from public.student_assignment_progress sap),0),
    (select count(distinct a.user_id) from public.student_activity a join public.user_roles ur on ur.user_id=a.user_id and ur.role='student' where a.created_at>=now()-interval '15 minutes')::bigint,
    (select count(*) from public.student_assignment_progress sap join public.assignments a on a.id=sap.assignment_id where sap.status<>'completed' and a.due_at<now())::bigint,
    (select count(distinct sp.user_id) from public.student_progress sp where sp.attempts>5)::bigint;
end;
$$;

create or replace function public.admin_get_student_learning_summaries()
returns table(user_id uuid,display_name text,current_level_id text,assigned_count bigint,pending_assignments bigint,needs_attention boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  return query select p.id,p.display_name,
    (select a.level_id from public.student_activity a where a.user_id=p.id and a.event_type='LEVEL_STARTED' order by a.created_at desc limit 1),
    (select count(*) from public.student_assignment_progress sap where sap.user_id=p.id)::bigint,
    (select count(*) from public.student_assignment_progress sap join public.assignments assignment_row on assignment_row.id=sap.assignment_id where sap.user_id=p.id and sap.status<>'completed' and assignment_row.status='active')::bigint,
    (coalesce((select avg(sp.best_score) from public.student_progress sp where sp.user_id=p.id),100)<70
      or coalesce((select max(a.created_at) from public.student_activity a where a.user_id=p.id),p.created_at)<now()-interval '7 days')
  from public.profiles p join public.user_roles ur on ur.user_id=p.id and ur.role='student';
end;
$$;

create or replace function public.admin_get_learning_audit(p_limit integer default 100)
returns table(id bigint,admin_id uuid,action text,target_type text,target_value text,content_type text,content_id text,assignment_id uuid,details jsonb,created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  return query select a.id,a.admin_id,a.action,a.target_type,a.target_value,a.content_type,a.content_id,a.assignment_id,a.details,a.created_at from public.admin_learning_audit a order by a.created_at desc limit least(greatest(p_limit,1),200);
end;
$$;

-- Public/student leaderboards must never include administrators, even when an
-- older admin account happens to have a legacy row in public.profiles.
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

-- Keep the competitive result pipeline authoritative while allowing a teacher's
-- explicit OPEN/ASSIGNED rule to bypass only the normal predecessor check.
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
  v_effective_access text;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if public._is_admin(v_user) then raise exception 'admin_read_only' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user) then raise exception 'profile_required' using errcode = '42501'; end if;
  if p_accuracy not between 0 and 100 or p_mistakes < 0 then raise exception 'result_invalid' using errcode = '22023'; end if;
  select * into v_level from public.game_levels gl where gl.level_id = p_level_id;
  if not found then raise exception 'unknown_level' using errcode = '22023'; end if;

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
  select * into v_progress from public.student_progress sp where sp.user_id = v_user and sp.level_id = p_level_id for update;
  v_first := not found;
  v_effective_access := public._effective_learning_access(v_user, case when v_level.is_boss then 'boss' else 'level' end, p_level_id);

  if v_effective_access not in ('open','assigned','completed') then
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
    values (v_user, p_level_id, 20, 'perfect_bonus', p_level_id || ':perfect')
    on conflict (user_id, transaction_key) do nothing;
    v_awarded := v_awarded + 20;
  end if;

  insert into public.result_submissions(submission_id, user_id, level_id, accuracy, mistakes, awarded_xp)
  values (p_submission_id, v_user, p_level_id, p_accuracy, p_mistakes, v_awarded);

  insert into public.student_achievements(user_id, achievement_code) values (v_user, 'first-level') on conflict do nothing;
  if v_level.difficulty = 3 then insert into public.student_achievements(user_id, achievement_code) values (v_user, 'first-experiment') on conflict do nothing; end if;
  if v_level.difficulty = 4 then insert into public.student_achievements(user_id, achievement_code) values (v_user, 'first-challenge') on conflict do nothing; end if;
  if v_stars = 3 then insert into public.student_achievements(user_id, achievement_code) values (v_user, 'perfect-level') on conflict do nothing; end if;
  if v_level.is_boss then insert into public.student_achievements(user_id, achievement_code) values (v_user, v_level.section_id || '-master') on conflict do nothing; end if;
  if (select count(*) = 10 and bool_and(recent.mistakes = 0) from (select rs.mistakes from public.result_submissions rs where rs.user_id = v_user order by rs.created_at desc limit 10) recent) then
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

revoke all on function public._learning_target_matches(uuid,text,text), public._validate_learning_target(text,text), public._assignment_level_ids(uuid), public._refresh_assignment_progress(uuid,uuid), public._attach_learning_assignments(), public._refresh_learning_assignments_after_progress(), public._mark_learning_assignment_started(), public._find_learning_assignment(uuid,text,text), public._resolve_learning_rule(uuid,text,text), public._learning_content_completed(uuid,text,text), public._normal_learning_access(uuid,text,text), public._effective_learning_access(uuid,text,text) from public,anon,authenticated;
revoke all on function public.get_my_content_access(),public.get_my_assignments(),public.admin_set_content_access(text,text,text,text,text),public.admin_clear_content_access(text,text,text,text),public.admin_create_assignment(text,text,text,text,timestamptz,timestamptz,text,text,text[],text[],text[]),public.admin_update_assignment(uuid,text,text,text,text,timestamptz,timestamptz,text,text),public.admin_get_assignments(text,integer,integer),public.admin_get_student_assignments(uuid),public.admin_get_student_access(uuid),public.admin_get_content_overview(),public.admin_get_learning_dashboard(),public.admin_get_student_learning_summaries(),public.admin_get_learning_audit(integer) from public,anon;
grant execute on function public.get_my_content_access(),public.get_my_assignments() to authenticated;
grant execute on function public.admin_set_content_access(text,text,text,text,text),public.admin_clear_content_access(text,text,text,text),public.admin_create_assignment(text,text,text,text,timestamptz,timestamptz,text,text,text[],text[],text[]),public.admin_update_assignment(uuid,text,text,text,text,timestamptz,timestamptz,text,text),public.admin_get_assignments(text,integer,integer),public.admin_get_student_assignments(uuid),public.admin_get_student_access(uuid),public.admin_get_content_overview(),public.admin_get_learning_dashboard(),public.admin_get_student_learning_summaries(),public.admin_get_learning_audit(integer) to authenticated;

commit;
