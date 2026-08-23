begin;

-- Resolve recipient modes exclusively on the server. The caller sends a compact
-- mode/value selection; UUID expansion never happens through many client calls.
create or replace function public._admin_selected_students(
  p_target_mode text,
  p_target_values text[] default '{}'::text[]
) returns table(user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_target_mode not in ('all','grades','users') then
    raise exception 'target_mode_invalid' using errcode = '22023';
  end if;
  if p_target_mode <> 'all' and coalesce(cardinality(p_target_values), 0) = 0 then
    raise exception 'recipients_required' using errcode = '22023';
  end if;
  if p_target_mode = 'grades' and exists (
    select 1 from unnest(p_target_values) value
    where value !~ '^[1-9][0-2]?$'
  ) then
    raise exception 'grade_invalid' using errcode = '22023';
  end if;
  if p_target_mode = 'grades' and exists (
    select 1 from unnest(p_target_values) value
    where value::integer not between 1 and 12
  ) then
    raise exception 'grade_invalid' using errcode = '22023';
  end if;
  if p_target_mode = 'users' and exists (
    select 1 from unnest(p_target_values) value
    where value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception 'target_invalid' using errcode = '22023';
  end if;

  return query
  select profile.id
  from public.profiles profile
  join public.user_roles role_row on role_row.user_id = profile.id and role_row.role = 'student'
  where p_target_mode = 'all'
    or (p_target_mode = 'grades' and profile.grade::text = any(p_target_values))
    or (p_target_mode = 'users' and profile.id::text = any(p_target_values));
end;
$$;

create or replace function public.admin_count_content_recipients(
  p_target_mode text,
  p_target_values text[] default '{}'::text[]
) returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public._is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return (select count(*)::bigint from public._admin_selected_students(p_target_mode, p_target_values));
end;
$$;

create or replace function public.admin_get_content_recipients(
  p_content_type text,
  p_content_id text,
  p_search text default null,
  p_grade smallint default null,
  p_active text default 'all',
  p_limit integer default 500,
  p_offset integer default 0
) returns table(
  user_id uuid,
  nickname text,
  display_name text,
  avatar text,
  grade smallint,
  school text,
  xp bigint,
  last_active timestamptz,
  access_state text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public._is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_active not in ('all','today','week') then
    raise exception 'filter_invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.learning_content_catalog catalog
    where catalog.content_type = p_content_type and catalog.content_id = p_content_id
  ) then
    raise exception 'content_not_found' using errcode = '22023';
  end if;

  return query
  with last_seen as (
    select activity.user_id, max(activity.created_at) as value
    from public.student_activity activity
    group by activity.user_id
  ), xp_total as (
    select tx.user_id, sum(tx.xp)::bigint as value
    from public.xp_transactions tx
    group by tx.user_id
  ), filtered as (
    select profile.id, profile.nickname, profile.display_name,
      coalesce(profile.avatar_path || '?v=' || (extract(epoch from profile.updated_at)::bigint)::text, profile.avatar) as avatar,
      profile.grade, profile.school, coalesce(xp_total.value, 0)::bigint as xp,
      last_seen.value as last_active,
      public._effective_learning_access(profile.id, p_content_type, p_content_id) as access_state
    from public.profiles profile
    join public.user_roles role_row on role_row.user_id = profile.id and role_row.role = 'student'
    left join last_seen on last_seen.user_id = profile.id
    left join xp_total on xp_total.user_id = profile.id
    where (p_grade is null or profile.grade = p_grade)
      and (p_active = 'all'
        or (p_active = 'today' and last_seen.value >= date_trunc('day', now()))
        or (p_active = 'week' and last_seen.value >= now() - interval '7 days'))
      and (p_search is null or btrim(p_search) = ''
        or profile.nickname ilike '%' || btrim(p_search) || '%'
        or profile.display_name ilike '%' || btrim(p_search) || '%'
        or coalesce(profile.school, '') ilike '%' || btrim(p_search) || '%'
        or profile.grade::text = btrim(p_search))
  )
  select filtered.id, filtered.nickname, filtered.display_name, filtered.avatar,
    filtered.grade, filtered.school, filtered.xp, filtered.last_active,
    filtered.access_state, count(*) over()::bigint
  from filtered
  order by lower(filtered.nickname), filtered.id
  limit least(greatest(p_limit, 1), 500)
  offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_bulk_set_content_access(
  p_target_mode text,
  p_target_values text[],
  p_content_type text,
  p_content_id text,
  p_access_state text,
  p_title_kk text default null,
  p_title_ru text default null
) returns table(affected_students bigint, affected_rules bigint, assignment_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_student_ids uuid[];
  v_student_id uuid;
  v_student_count bigint := 0;
  v_rule_count bigint := 0;
  v_assignment_id uuid;
  v_action text;
begin
  if not public._is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_access_state not in ('open','locked','hidden','assigned') then
    raise exception 'access_state_invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.learning_content_catalog catalog
    where catalog.content_type = p_content_type and catalog.content_id = p_content_id
  ) then
    raise exception 'content_not_found' using errcode = '22023';
  end if;

  select array_agg(selected.user_id order by selected.user_id), count(*)::bigint
  into v_student_ids, v_student_count
  from public._admin_selected_students(p_target_mode, coalesce(p_target_values, '{}'::text[])) selected;
  if v_student_count = 0 then
    raise exception 'recipients_not_found' using errcode = '22023';
  end if;

  if p_access_state = 'assigned' then
    insert into public.assignments(
      title_kk, title_ru, description_kk, description_ru, created_by,
      available_from, priority, status
    ) values (
      coalesce(nullif(btrim(p_title_kk), ''), p_content_id),
      coalesce(nullif(btrim(p_title_ru), ''), p_content_id),
      '', '', v_admin, now(), 'normal', 'active'
    ) returning id into v_assignment_id;

    insert into public.assignment_items(assignment_id, content_type, content_id, sort_order)
    values(v_assignment_id, p_content_type, p_content_id, 1);

    if p_target_mode = 'all' then
      insert into public.assignment_targets(assignment_id, target_type, target_value)
      values(v_assignment_id, 'all', 'all');
    elsif p_target_mode = 'grades' then
      insert into public.assignment_targets(assignment_id, target_type, target_value)
      select v_assignment_id, 'grade', target.value
      from (select distinct unnest(p_target_values) as value) target;
    else
      insert into public.assignment_targets(assignment_id, target_type, target_value)
      select v_assignment_id, 'user', recipient.user_id::text
      from unnest(v_student_ids) as recipient(user_id);
    end if;

    foreach v_student_id in array v_student_ids loop
      perform public._refresh_assignment_progress(v_assignment_id, v_student_id);
    end loop;

    insert into public.admin_learning_audit(admin_id, action, target_type, target_value, assignment_id, details)
    values(v_admin, 'ADMIN_ASSIGNMENT_CREATED', p_target_mode, array_to_string(p_target_values, ','),
      v_assignment_id, jsonb_build_object('content_type', p_content_type, 'content_id', p_content_id, 'students', v_student_count));
  end if;

  -- Exact user rules make the confirmed recipient set authoritative. In the
  -- ASSIGNED case the real assignment remains the source of progress/home cards,
  -- while this rule safely overrides an older inherited LOCKED/HIDDEN rule.
  insert into public.content_access_rules(
    target_type, target_value, content_type, content_id, access_state, assigned_by
  )
  select 'user', recipient.user_id::text, p_content_type, p_content_id, p_access_state, v_admin
  from unnest(v_student_ids) as recipient(user_id)
  on conflict(target_type, target_value, content_type, content_id) do update set
    access_state = excluded.access_state,
    assigned_by = excluded.assigned_by,
    updated_at = now();
  get diagnostics v_rule_count = row_count;

  v_action := case p_access_state
    when 'open' then 'ADMIN_CONTENT_OPENED'
    when 'locked' then 'ADMIN_CONTENT_LOCKED'
    when 'hidden' then 'ADMIN_CONTENT_HIDDEN'
    else 'ADMIN_CONTENT_ASSIGNED'
  end;
  insert into public.admin_learning_audit(
    admin_id, action, target_type, target_value, content_type, content_id, assignment_id, details
  ) values (
    v_admin, v_action, p_target_mode, array_to_string(p_target_values, ','),
    p_content_type, p_content_id, v_assignment_id,
    jsonb_build_object('students', v_student_count, 'rules', v_rule_count)
  );

  return query select v_student_count, v_rule_count, v_assignment_id;
end;
$$;

revoke all on function public._admin_selected_students(text,text[]) from public, anon, authenticated;
revoke all on function public.admin_count_content_recipients(text,text[]) from public, anon;
revoke all on function public.admin_get_content_recipients(text,text,text,smallint,text,integer,integer) from public, anon;
revoke all on function public.admin_bulk_set_content_access(text,text[],text,text,text,text,text) from public, anon;

grant execute on function public.admin_count_content_recipients(text,text[]) to authenticated;
grant execute on function public.admin_get_content_recipients(text,text,text,smallint,text,integer,integer) to authenticated;
grant execute on function public.admin_bulk_set_content_access(text,text[],text,text,text,text,text) to authenticated;

commit;
