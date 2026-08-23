begin;

-- Extend the existing catalog instead of creating a parallel achievement model.
alter table public.achievement_catalog
  add column if not exists category text,
  add column if not exists rarity text,
  add column if not exists description_kk text,
  add column if not exists description_ru text,
  add column if not exists icon text,
  add column if not exists hidden boolean not null default false,
  add column if not exists reward_xp integer not null default 0,
  add column if not exists reward_crystals integer not null default 0,
  add column if not exists reward_title_kk text,
  add column if not exists reward_title_ru text,
  add column if not exists target_value integer not null default 1,
  add column if not exists is_core boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists active boolean not null default true;

alter table public.achievement_catalog drop constraint if exists achievement_catalog_category_check;
alter table public.achievement_catalog add constraint achievement_catalog_category_check check (category in (
  'beginning','research','experiments','accuracy','logic','data','streaks','error_recovery',
  'earth','biology','physics','chemistry','astronomy','ecology','interdisciplinary','mastery','legendary'
));
alter table public.achievement_catalog drop constraint if exists achievement_catalog_rarity_check;
alter table public.achievement_catalog add constraint achievement_catalog_rarity_check check (rarity in ('COMMON','RARE','EPIC','LEGENDARY'));
alter table public.achievement_catalog drop constraint if exists achievement_catalog_reward_check;
alter table public.achievement_catalog add constraint achievement_catalog_reward_check check (
  reward_xp between 0 and 320 and reward_crystals between 0 and 100 and target_value > 0
);

insert into public.achievement_catalog(
  code,title_kk,title_ru,description_kk,description_ru,icon,category,rarity,hidden,
  reward_xp,reward_crystals,reward_title_kk,reward_title_ru,target_value,is_core,sort_order,active
) values
  ('first-level','Алғашқы қадам','Первый шаг','Алғашқы деңгейді аяқта.','Заверши первый уровень.','🚀','beginning','COMMON',false,5,0,'Жас зерттеуші','Юный исследователь',1,true,10,true),
  ('first-experiment','Алғашқы эксперимент','Первый эксперимент','Алғашқы тәжірибелік тапсырманы аяқта.','Заверши первое экспериментальное задание.','🧪','experiments','COMMON',false,10,1,null,null,1,true,20,true),
  ('perfect-level','Мүлтіксіз нәтиже','Идеальный результат','Толық квесті 100% нәтижемен аяқта.','Заверши полный квест с результатом 100%.','🎯','accuracy','RARE',false,20,3,null,null,1,true,30,true),
  ('streak-10','Дәл мерген','Точный стрелок','10 тапсырманы қатесіз қатарынан орында.','Выполни 10 заданий подряд без ошибок.','🎯','accuracy','RARE',false,25,4,null,null,10,true,40,true),
  ('first-challenge','Ғылыми сынақ','Science Challenge','Алғашқы күрделі Challenge тапсырмасын аяқта.','Заверши первое сложное задание Challenge.','🏆','research','COMMON',false,15,2,null,null,1,true,50,true),
  ('research-master','Дәлелдер шебері','Мастер доказательств','Зерттеу бөлімінің Boss Mission тапсырмасын аяқта.','Заверши Boss Mission исследовательского раздела.','🔬','research','EPIC',false,35,5,'Зерттеуші','Исследователь',1,true,60,true),
  ('earth-master','Жер зерттеушісі','Исследователь Земли','Жер туралы ғылымдар миссиясын аяқта.','Заверши миссию наук о Земле.','🌍','earth','EPIC',false,35,5,null,null,1,true,70,true),
  ('matter-master','Заттар сарапшысы','Эксперт по веществам','Заттар мен химиялық құбылыстар миссиясын аяқта.','Заверши миссию о веществах и химических явлениях.','⚗️','chemistry','EPIC',false,35,5,null,null,1,true,80,true),
  ('life-master','Тіршілік сақшысы','Хранитель жизни','Тіршілік туралы негізгі миссияларды аяқта.','Заверши основные миссии о живой природе.','🧬','biology','EPIC',false,35,5,null,null,1,true,90,true),
  ('energy-master','Энергия инженері','Инженер энергии','Энергия мен физика миссиясын аяқта.','Заверши миссию об энергии и физических явлениях.','⚙️','physics','EPIC',false,35,5,null,null,1,true,100,true),
  ('ecology-master','Тұрақты болашақ','Устойчивое будущее','Экологиялық миссияны аяқта.','Заверши экологическую миссию.','♻️','ecology','EPIC',false,35,5,null,null,1,true,110,true),
  ('research-eye','Зерттеуші көзі','Глаз исследователя','Бақылау, салыстыру немесе талдауға арналған 5 бірегей тапсырманы дұрыс орында.','Правильно выполни 5 уникальных заданий на наблюдение, сравнение или анализ.','🔍','research','RARE',false,15,2,null,null,5,true,120,true),
  ('experiment-master','Тәжірибе шебері','Мастер экспериментов','5 бірегей тәжірибелік тапсырманы сәтті аяқта.','Успешно заверши 5 уникальных экспериментальных заданий.','🧪','experiments','RARE',false,25,4,null,null,5,true,130,true),
  ('eureka','Эврика!','Эврика!','Күрделі Challenge тапсырмасын бірінші әрекеттен орында.','Реши сложный Challenge с первой попытки.','💡','accuracy','EPIC',false,40,8,null,null,1,true,140,true),
  ('science-streak','Ғылым сериясы','Научная серия','Asia/Almaty уақыты бойынша 5 күн қатарынан оқу әрекетін орында.','Совершай значимое учебное действие 5 дней подряд по времени Asia/Almaty.','🔥','streaks','RARE',false,25,4,null,null,5,true,150,true),
  ('logic-master','Логика шебері','Мастер логики','10 бірегей логикалық немесе аналитикалық тапсырманы орында.','Реши 10 уникальных логических или аналитических заданий.','🧠','logic','RARE',false,25,4,null,null,10,true,160,true),
  ('data-detective','Деректер детективі','Детектив данных','Деректермен жұмыс істейтін 10 бірегей тапсырманы дұрыс орында.','Правильно реши 10 уникальных заданий с данными.','📊','data','RARE',false,30,5,null,null,10,true,170,true),
  ('true-scientist','Нағыз ғалым','Настоящий учёный','Зерттеу бөлімінің толық ғылыми циклін аяқта.','Пройди полный научный цикл исследовательского раздела.','🔬','research','EPIC',false,50,10,'Ғалым','Учёный',13,true,180,true),
  ('learned-from-mistake','Қателіктен үйрендім','Учусь на ошибках','Қате орындалған тапсырманы кейін дұрыс орында.','Исправь ранее неверно выполненное задание.','🔄','error_recovery','RARE',false,20,3,null,null,1,true,190,true),
  ('persistent-researcher','Табанды зерттеуші','Настойчивый исследователь','Үш сәтсіз әрекеттен кейін күрделі тапсырманы орында.','Заверши сложное задание после трёх неудачных попыток.','🛠️','error_recovery','EPIC',false,35,6,null,null,1,true,200,true),
  ('three-star-master','Үш жұлдыз шебері','Мастер трёх звёзд','10 бірегей деңгейде үш жұлдыз ал.','Получи три звезды в 10 уникальных уровнях.','⭐','mastery','RARE',false,30,5,null,null,10,true,210,true),
  ('first-boss','Миссия орындалды','Миссия выполнена','Алғашқы Boss Mission тапсырмасын аяқта.','Заверши первую Boss Mission.','🚀','mastery','RARE',false,25,4,null,null,1,true,220,true),
  ('quest-master','Квест шебері','Мастер квестов','25 бірегей квесті аяқта.','Заверши 25 уникальных квестов.','🏆','mastery','EPIC',false,50,8,'Ғылым шебері','Мастер науки',25,true,230,true),
  ('interdisciplinary-thinker','Пәнаралық ойшыл','Межпредметный мыслитель','Әртүрлі ғылымдарды біріктіретін күрделі тапсырмаларды орында.','Выполни сложные задания, объединяющие разные науки.','🧩','interdisciplinary','EPIC',false,40,8,null,null,2,true,240,true),
  ('space-explorer','Ғарыш зерттеушісі','Исследователь космоса','Ғарыш пен Күн жүйесінің негізгі блогын аяқта.','Заверши основной блок о космосе и Солнечной системе.','🌌','astronomy','RARE',false,30,5,null,null,8,true,250,true),
  ('science-champion','Ғылым чемпионы','Чемпион науки','1000 XP жина.','Набери 1000 XP.','👑','mastery','RARE',false,40,6,null,null,1000,true,260,true),
  ('knowledge-treasure','Білім қазынасы','Сокровище знаний','Барлығы 100 білім кристалын жина.','Заработай суммарно 100 кристаллов знаний.','💎','mastery','RARE',false,25,5,null,null,100,true,270,true),
  ('all-sciences','Барлығын зерттеуші','Исследователь всего','Барлық алты негізгі ғылым бөлімінде тапсырма аяқта.','Заверши задания во всех шести основных научных разделах.','🗺️','interdisciplinary','EPIC',false,50,10,null,null,6,true,280,true),
  ('science-legend','Ғылым аңызы','Легенда науки','Барлық негізгі жетістіктерді аш.','Открой все основные достижения.','🌟','legendary','LEGENDARY',false,150,30,'Ғылым аңызы','Легенда науки',1,false,290,true),
  ('lightning','Найзағай','Молния','Қысқа уақыт ішінде 5 тапсырманы қатесіз орында.','Выполни 5 заданий подряд без ошибок за короткое время.','⚡','accuracy','RARE',true,20,3,null,null,5,false,300,true),
  ('flawless-scientist','Қатесіз ғалым','Учёный без ошибок','Бір тақырыптың толық квестін қатесіз аяқта.','Пройди полный квест одной темы без ошибок.','🧠','accuracy','EPIC',true,35,6,null,null,1,false,310,true),
  ('second-chance','Екінші мүмкіндік','Второй шанс','Бір миссиядағы бұрынғы қателерді толық түзет.','Исправь все прежние ошибки одной миссии.','🔁','error_recovery','RARE',true,25,4,null,null,1,false,320,true)
on conflict (code) do update set
  title_kk=excluded.title_kk,title_ru=excluded.title_ru,description_kk=excluded.description_kk,description_ru=excluded.description_ru,
  icon=excluded.icon,category=excluded.category,rarity=excluded.rarity,hidden=excluded.hidden,reward_xp=excluded.reward_xp,
  reward_crystals=excluded.reward_crystals,reward_title_kk=excluded.reward_title_kk,reward_title_ru=excluded.reward_title_ru,
  target_value=excluded.target_value,is_core=excluded.is_core,sort_order=excluded.sort_order,active=excluded.active;

alter table public.profiles add column if not exists selected_title_code text;
alter table public.profiles drop constraint if exists profiles_selected_title_code_fkey;
alter table public.profiles add constraint profiles_selected_title_code_fkey foreign key (selected_title_code)
  references public.achievement_catalog(code) on delete set null;

create table if not exists public.achievement_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_code text not null references public.achievement_catalog(code) on delete cascade,
  current_value integer not null default 0 check (current_value >= 0),
  target_value integer not null check (target_value > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

create index if not exists achievement_progress_user on public.achievement_progress(user_id, updated_at desc);
create index if not exists student_achievements_code_date on public.student_achievements(achievement_code, earned_at);

alter table public.achievement_progress enable row level security;
drop policy if exists achievement_progress_read_own on public.achievement_progress;
create policy achievement_progress_read_own on public.achievement_progress for select to authenticated using (user_id = auth.uid());

revoke all on public.achievement_progress from anon, authenticated;
-- Hidden definitions and progress are exposed only through the masking RPC.
revoke select on public.achievement_catalog from authenticated;
revoke insert, update, delete on public.student_achievements from authenticated;

-- Achievement rewards share the authoritative XP/crystal ledger. A unique
-- transaction key makes rewards idempotent under retries and parallel requests.
alter table public.xp_transactions drop constraint if exists xp_transactions_reason_check;
alter table public.xp_transactions add constraint xp_transactions_reason_check
  check (reason in ('level_completion','perfect_bonus','achievement_reward'));

create or replace function public._award_achievement(p_user uuid, p_code text, p_level_id text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_inserted integer := 0;
  v_reward record;
  v_level_id text := p_level_id;
begin
  if not exists(select 1 from public.achievement_catalog catalog where catalog.code=p_code and catalog.active) then return false; end if;
  if v_level_id is null then select gl.level_id into v_level_id from public.game_levels gl order by gl.unlock_order limit 1; end if;
  insert into public.student_achievements(user_id,achievement_code) values(p_user,p_code) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  select catalog.reward_xp,catalog.reward_crystals into v_reward from public.achievement_catalog catalog where catalog.code=p_code;
  if v_reward.reward_xp > 0 or v_reward.reward_crystals > 0 then
    insert into public.xp_transactions(user_id,level_id,xp,science_points,reason,transaction_key)
    values(p_user,v_level_id,v_reward.reward_xp,v_reward.reward_crystals,'achievement_reward','achievement:'||p_code)
    on conflict(user_id,transaction_key) do nothing;
  end if;
  return v_inserted > 0;
end;
$$;

create or replace function public._evaluate_achievements(p_user uuid, p_level_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_levels integer:=0; v_experiments integer:=0; v_research_eye integer:=0; v_logic integer:=0; v_data integer:=0;
  v_three_star integer:=0; v_bosses integer:=0; v_challenges integer:=0; v_sections integer:=0; v_space integer:=0; v_research integer:=0;
  v_total_xp integer:=0; v_crystals integer:=0; v_day_streak integer:=0; v_clean_streak integer:=0;
  v_error_recovery boolean:=false; v_persistent boolean:=false; v_eureka boolean:=false; v_lightning boolean:=false; v_flawless boolean:=false;
  v_second_chance boolean:=false; v_interdisciplinary integer:=0; v_core_total integer:=0; v_core_unlocked integer:=0;
begin
  select count(*) filter(where not gl.is_boss),count(*) filter(where gl.is_boss),count(*) filter(where gl.difficulty>=4),
    count(*) filter(where sp.stars=3),count(distinct gl.section_id),
    count(*) filter(where gl.section_id='research'),
    count(*) filter(where gl.level_id ~ '^(scales-universe|solar-system)-')
  into v_levels,v_bosses,v_challenges,v_three_star,v_sections,v_research,v_space
  from public.student_progress sp join public.game_levels gl on gl.level_id=sp.level_id
  where sp.user_id=p_user and sp.completed;

  select
    count(distinct rs.level_id) filter(where rs.accuracy>=70 and rs.level_id ~ '-apply$'),
    count(distinct rs.level_id) filter(where rs.accuracy>=70 and rs.level_id ~ '-(know|understand)$'),
    count(distinct rs.level_id) filter(where rs.accuracy>=70 and rs.level_id ~ '-(understand|challenge)$'),
    count(distinct rs.level_id) filter(where rs.accuracy>=70 and rs.level_id ~ '-apply$')
  into v_experiments,v_research_eye,v_logic,v_data
  from public.result_submissions rs where rs.user_id=p_user;

  select count(distinct gl.section_id) into v_interdisciplinary
  from public.student_progress sp join public.game_levels gl on gl.level_id=sp.level_id
  where sp.user_id=p_user and sp.completed and gl.difficulty>=4;

  select coalesce(sum(tx.xp),0),coalesce(sum(tx.science_points),0) into v_total_xp,v_crystals
  from public.xp_transactions tx where tx.user_id=p_user;

  select count(*) into v_clean_streak from (
    select rs.mistakes,rs.accuracy from public.result_submissions rs
    where rs.user_id=p_user order by rs.created_at desc,rs.submission_id desc limit 10
  ) recent where recent.mistakes=0 and recent.accuracy>=70;

  with activity_days as (
    select distinct (rs.created_at at time zone 'Asia/Almaty')::date as activity_date
    from public.result_submissions rs where rs.user_id=p_user
  ), grouped_days as (
    select activity_date,activity_date-(row_number() over(order by activity_date))::integer as island_key from activity_days
  ), streak_runs as (
    select count(*)::integer as run_length from grouped_days group by island_key
  ) select coalesce(max(run_length),0) into v_day_streak from streak_runs;

  select exists(
    select 1 from public.result_submissions passed
    where passed.user_id=p_user and passed.accuracy>=70 and exists(
      select 1 from public.result_submissions failed where failed.user_id=p_user and failed.level_id=passed.level_id
        and failed.created_at<passed.created_at and failed.accuracy<70
    )
  ) into v_error_recovery;

  select exists(
    select 1 from public.result_submissions passed join public.game_levels gl on gl.level_id=passed.level_id
    where passed.user_id=p_user and passed.accuracy>=70 and gl.difficulty>=4 and (
      select count(*) from public.result_submissions failed where failed.user_id=p_user and failed.level_id=passed.level_id
        and failed.created_at<passed.created_at and failed.accuracy<70
    )>=3
  ) into v_persistent;

  select exists(
    select 1 from public.result_submissions first_try join public.game_levels gl on gl.level_id=first_try.level_id
    where first_try.user_id=p_user and first_try.accuracy>=70 and gl.difficulty>=4 and not exists(
      select 1 from public.result_submissions earlier where earlier.user_id=p_user and earlier.level_id=first_try.level_id
        and (earlier.created_at,earlier.submission_id)<(first_try.created_at,first_try.submission_id)
    )
  ) into v_eureka;

  select exists(
    select 1 from public.result_submissions fifth
    where fifth.user_id=p_user and fifth.mistakes=0 and fifth.accuracy>=70 and (
      select count(*) from (
        select recent.mistakes,recent.accuracy,recent.created_at from public.result_submissions recent
        where recent.user_id=p_user and (recent.created_at,recent.submission_id)<=(fifth.created_at,fifth.submission_id)
        order by recent.created_at desc,recent.submission_id desc limit 5
      ) five where five.mistakes=0 and five.accuracy>=70
    )=5 and fifth.created_at-(
      select min(five_dates.created_at) from (
        select recent.created_at from public.result_submissions recent
        where recent.user_id=p_user and (recent.created_at,recent.submission_id)<=(fifth.created_at,fifth.submission_id)
        order by recent.created_at desc,recent.submission_id desc limit 5
      ) five_dates
    )<=interval '15 minutes'
  ) into v_lightning;

  select exists(
    select 1 from (
      select regexp_replace(gl.level_id,'-(know|understand|apply|challenge)$','') topic_id
      from public.student_progress sp join public.game_levels gl on gl.level_id=sp.level_id
      where sp.user_id=p_user and not gl.is_boss and sp.completed
      group by regexp_replace(gl.level_id,'-(know|understand|apply|challenge)$','')
      having count(*)=4 and sum(sp.mistakes)=0
    ) clean_topic
  ) into v_flawless;

  select exists(
    select 1 from (
      select regexp_replace(gl.level_id,'-(know|understand|apply|challenge)$','') topic_id
      from public.student_progress sp join public.game_levels gl on gl.level_id=sp.level_id
      where sp.user_id=p_user and not gl.is_boss and sp.completed and sp.best_score>=70
      group by regexp_replace(gl.level_id,'-(know|understand|apply|challenge)$','')
      having count(*)=4
    ) complete_topic where exists(
      select 1 from public.result_submissions failed
      where failed.user_id=p_user and failed.accuracy<70 and failed.level_id like complete_topic.topic_id||'-%'
    )
  ) into v_second_chance;

  if v_levels>0 then perform public._award_achievement(p_user,'first-level',p_level_id); end if;
  if v_experiments>0 then perform public._award_achievement(p_user,'first-experiment',p_level_id); end if;
  if exists(select 1 from public.result_submissions rs where rs.user_id=p_user and rs.accuracy=100) then perform public._award_achievement(p_user,'perfect-level',p_level_id); end if;
  if v_clean_streak>=10 then perform public._award_achievement(p_user,'streak-10',p_level_id); end if;
  if exists(select 1 from public.student_progress sp join public.game_levels gl on gl.level_id=sp.level_id where sp.user_id=p_user and gl.difficulty>=4) then perform public._award_achievement(p_user,'first-challenge',p_level_id); end if;
  if exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:research') then perform public._award_achievement(p_user,'research-master',p_level_id); end if;
  if exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:earth') then perform public._award_achievement(p_user,'earth-master',p_level_id); end if;
  if exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:matter') then perform public._award_achievement(p_user,'matter-master',p_level_id); end if;
  if exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:life') then perform public._award_achievement(p_user,'life-master',p_level_id); end if;
  if exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:energy') then perform public._award_achievement(p_user,'energy-master',p_level_id); end if;
  if exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:ecology') then perform public._award_achievement(p_user,'ecology-master',p_level_id); end if;
  if v_research_eye>=5 then perform public._award_achievement(p_user,'research-eye',p_level_id); end if;
  if v_experiments>=5 then perform public._award_achievement(p_user,'experiment-master',p_level_id); end if;
  if v_eureka then perform public._award_achievement(p_user,'eureka',p_level_id); end if;
  if v_day_streak>=5 then perform public._award_achievement(p_user,'science-streak',p_level_id); end if;
  if v_logic>=10 then perform public._award_achievement(p_user,'logic-master',p_level_id); end if;
  if v_data>=10 then perform public._award_achievement(p_user,'data-detective',p_level_id); end if;
  if v_research>=13 then perform public._award_achievement(p_user,'true-scientist',p_level_id); end if;
  if v_error_recovery then perform public._award_achievement(p_user,'learned-from-mistake',p_level_id); end if;
  if v_persistent then perform public._award_achievement(p_user,'persistent-researcher',p_level_id); end if;
  if v_three_star>=10 then perform public._award_achievement(p_user,'three-star-master',p_level_id); end if;
  if v_bosses>=1 then perform public._award_achievement(p_user,'first-boss',p_level_id); end if;
  if v_levels>=25 then perform public._award_achievement(p_user,'quest-master',p_level_id); end if;
  if v_interdisciplinary>=2 then perform public._award_achievement(p_user,'interdisciplinary-thinker',p_level_id); end if;
  if v_space>=8 then perform public._award_achievement(p_user,'space-explorer',p_level_id); end if;
  if v_sections>=6 then perform public._award_achievement(p_user,'all-sciences',p_level_id); end if;
  if v_lightning then perform public._award_achievement(p_user,'lightning',p_level_id); end if;
  if v_flawless then perform public._award_achievement(p_user,'flawless-scientist',p_level_id); end if;
  if v_second_chance then perform public._award_achievement(p_user,'second-chance',p_level_id); end if;

  select coalesce(sum(tx.xp),0),coalesce(sum(tx.science_points),0) into v_total_xp,v_crystals from public.xp_transactions tx where tx.user_id=p_user;
  if v_total_xp>=1000 then perform public._award_achievement(p_user,'science-champion',p_level_id); end if;
  if v_crystals>=100 then perform public._award_achievement(p_user,'knowledge-treasure',p_level_id); end if;

  select count(*) into v_core_total from public.achievement_catalog catalog where catalog.active and catalog.is_core and not catalog.hidden;
  select count(*) into v_core_unlocked from public.student_achievements earned join public.achievement_catalog catalog on catalog.code=earned.achievement_code
    where earned.user_id=p_user and catalog.active and catalog.is_core and not catalog.hidden;
  if v_core_total>0 and v_core_unlocked>=v_core_total then perform public._award_achievement(p_user,'science-legend',p_level_id); end if;

  insert into public.achievement_progress(user_id,achievement_code,current_value,target_value) values
    (p_user,'first-level',least(v_levels,1),1),(p_user,'first-experiment',least(v_experiments,1),1),
    (p_user,'perfect-level',case when exists(select 1 from public.result_submissions rs where rs.user_id=p_user and rs.accuracy=100) then 1 else 0 end,1),
    (p_user,'streak-10',least(v_clean_streak,10),10),(p_user,'first-challenge',least(v_challenges,1),1),
    (p_user,'research-master',case when exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:research') then 1 else 0 end,1),
    (p_user,'earth-master',case when exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:earth') then 1 else 0 end,1),
    (p_user,'matter-master',case when exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:matter') then 1 else 0 end,1),
    (p_user,'life-master',case when exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:life') then 1 else 0 end,1),
    (p_user,'energy-master',case when exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:energy') then 1 else 0 end,1),
    (p_user,'ecology-master',case when exists(select 1 from public.student_progress sp where sp.user_id=p_user and sp.level_id='boss:ecology') then 1 else 0 end,1),
    (p_user,'research-eye',least(v_research_eye,5),5),(p_user,'experiment-master',least(v_experiments,5),5),
    (p_user,'eureka',case when v_eureka then 1 else 0 end,1),(p_user,'science-streak',least(v_day_streak,5),5),
    (p_user,'logic-master',least(v_logic,10),10),(p_user,'data-detective',least(v_data,10),10),
    (p_user,'true-scientist',least(v_research,13),13),(p_user,'learned-from-mistake',case when v_error_recovery then 1 else 0 end,1),
    (p_user,'persistent-researcher',case when v_persistent then 1 else 0 end,1),(p_user,'three-star-master',least(v_three_star,10),10),
    (p_user,'first-boss',least(v_bosses,1),1),(p_user,'quest-master',least(v_levels,25),25),
    (p_user,'interdisciplinary-thinker',least(v_interdisciplinary,2),2),(p_user,'space-explorer',least(v_space,8),8),
    (p_user,'science-champion',least(v_total_xp,1000),1000),(p_user,'knowledge-treasure',least(v_crystals,100),100),
    (p_user,'all-sciences',least(v_sections,6),6),(p_user,'science-legend',least(v_core_unlocked,v_core_total),greatest(v_core_total,1)),
    (p_user,'lightning',case when v_lightning then 5 else 0 end,5),(p_user,'flawless-scientist',case when v_flawless then 1 else 0 end,1),
    (p_user,'second-chance',case when v_second_chance then 1 else 0 end,1)
  on conflict(user_id,achievement_code) do update set current_value=excluded.current_value,target_value=excluded.target_value,updated_at=now();
end;
$$;

create or replace function public.get_my_achievements()
returns table(code text,category text,rarity text,title_kk text,title_ru text,description_kk text,description_ru text,icon text,hidden boolean,reward_xp integer,reward_crystals integer,reward_title_kk text,reward_title_ru text,current_value integer,target_value integer,unlocked boolean,earned_at timestamptz,selected_title boolean,total_count bigint,unlocked_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  return query select catalog.code,catalog.category,catalog.rarity,
    case when catalog.hidden and earned.achievement_code is null then 'Құпия жетістік' else catalog.title_kk end,
    case when catalog.hidden and earned.achievement_code is null then 'Секретное достижение' else catalog.title_ru end,
    case when catalog.hidden and earned.achievement_code is null then 'Шартын өзің анықта!' else catalog.description_kk end,
    case when catalog.hidden and earned.achievement_code is null then 'Узнай условие сам!' else catalog.description_ru end,
    case when catalog.hidden and earned.achievement_code is null then '❓' else catalog.icon end,catalog.hidden,
    case when catalog.hidden and earned.achievement_code is null then 0 else catalog.reward_xp end,
    case when catalog.hidden and earned.achievement_code is null then 0 else catalog.reward_crystals end,
    case when earned.achievement_code is null then null else catalog.reward_title_kk end,
    case when earned.achievement_code is null then null else catalog.reward_title_ru end,
    case when catalog.hidden and earned.achievement_code is null then null else coalesce(progress.current_value,0) end,
    case when catalog.hidden and earned.achievement_code is null then null else catalog.target_value end,
    earned.achievement_code is not null,earned.earned_at,profile.selected_title_code=catalog.code,
    count(*) over()::bigint,count(earned.achievement_code) over()::bigint
  from public.achievement_catalog catalog
  left join public.student_achievements earned on earned.achievement_code=catalog.code and earned.user_id=v_user
  left join public.achievement_progress progress on progress.achievement_code=catalog.code and progress.user_id=v_user
  join public.profiles profile on profile.id=v_user
  where catalog.active order by catalog.sort_order,catalog.code;
end;
$$;

create or replace function public.set_my_profile_title(p_code text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_code is not null and not exists(
    select 1 from public.student_achievements earned join public.achievement_catalog catalog on catalog.code=earned.achievement_code
    where earned.user_id=v_user and earned.achievement_code=p_code and catalog.reward_title_kk is not null and catalog.reward_title_ru is not null
  ) then raise exception 'title_locked' using errcode='42501'; end if;
  update public.profiles profile set selected_title_code=p_code,updated_at=now() where profile.id=v_user;
end;
$$;

create or replace function public.get_admin_student_achievements(p_user_id uuid)
returns table(code text,category text,rarity text,title_kk text,title_ru text,icon text,current_value integer,target_value integer,unlocked boolean,earned_at timestamptz,selected_title boolean,total_count bigint,unlocked_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  return query select catalog.code,catalog.category,catalog.rarity,catalog.title_kk,catalog.title_ru,catalog.icon,
    coalesce(progress.current_value,0),catalog.target_value,earned.achievement_code is not null,earned.earned_at,
    profile.selected_title_code=catalog.code,count(*) over()::bigint,count(earned.achievement_code) over()::bigint
  from public.achievement_catalog catalog
  join public.profiles profile on profile.id=p_user_id
  left join public.student_achievements earned on earned.achievement_code=catalog.code and earned.user_id=p_user_id
  left join public.achievement_progress progress on progress.achievement_code=catalog.code and progress.user_id=p_user_id
  where catalog.active order by earned.earned_at desc nulls last,catalog.sort_order;
end;
$$;

create or replace function public.get_admin_achievement_analytics()
returns table(code text,title_kk text,title_ru text,rarity text,unlocked_students bigint,total_students bigint,unlock_percent numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public._is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  return query with student_total as (
    select count(*)::bigint as value from public.profiles profile join public.user_roles role_row on role_row.user_id=profile.id and role_row.role='student'
  ) select catalog.code,catalog.title_kk,catalog.title_ru,catalog.rarity,count(role_row.user_id)::bigint,student_total.value,
    round(count(role_row.user_id)::numeric/nullif(student_total.value,0)*100,1)
  from public.achievement_catalog catalog cross join student_total
  left join public.student_achievements earned on earned.achievement_code=catalog.code
  left join public.user_roles role_row on role_row.user_id=earned.user_id and role_row.role='student'
  where catalog.active group by catalog.code,catalog.title_kk,catalog.title_ru,catalog.rarity,catalog.sort_order,student_total.value
  order by count(role_row.user_id) desc,catalog.sort_order;
end;
$$;

create or replace function public._log_achievement_activity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_catalog record;
begin
  select catalog.reward_xp,catalog.reward_crystals,catalog.rarity into v_catalog from public.achievement_catalog catalog where catalog.code=new.achievement_code;
  insert into public.student_activity(user_id,event_type,metadata) values(new.user_id,'ACHIEVEMENT_EARNED',jsonb_build_object(
    'achievement_code',new.achievement_code,'reward_xp',coalesce(v_catalog.reward_xp,0),'reward_crystals',coalesce(v_catalog.reward_crystals,0),'rarity',v_catalog.rarity
  ));
  return new;
end;
$$;

-- V2 leaderboard RPCs preserve the ranking algorithm and add an optional title.
create or replace function public.get_leaderboard_v2(p_period text default 'total',p_section text default null,p_grade smallint default null,p_limit integer default 50,p_offset integer default 0)
returns table(rank bigint,nickname text,avatar text,xp bigint,stars bigint,completed_levels bigint,challenge_points bigint,challenges bigint,average_accuracy numeric,grade smallint,is_current boolean,total_count bigint,title_kk text,title_ru text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_period not in ('total','week','month') then raise exception 'period_invalid' using errcode='22023'; end if;
  return query select snapshot.rank,snapshot.nickname,snapshot.avatar,snapshot.xp,snapshot.stars,snapshot.completed_levels,
    snapshot.challenge_points,snapshot.challenges,snapshot.average_accuracy,snapshot.grade,snapshot.user_id=auth.uid(),snapshot.total_count,
    catalog.reward_title_kk,catalog.reward_title_ru
  from public._leaderboard_snapshot(p_period,p_section,p_grade) snapshot
  join public.profiles profile on profile.id=snapshot.user_id
  left join public.achievement_catalog catalog on catalog.code=profile.selected_title_code
  order by snapshot.rank limit least(greatest(p_limit,1),50) offset greatest(p_offset,0);
end;
$$;

create or replace function public.get_my_rank_v2(p_period text default 'total',p_section text default null,p_grade smallint default null)
returns table(rank bigint,nickname text,avatar text,xp bigint,stars bigint,completed_levels bigint,challenge_points bigint,challenges bigint,average_accuracy numeric,grade smallint,is_current boolean,total_count bigint,xp_to_next bigint,title_kk text,title_ru text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_period not in ('total','week','month') then raise exception 'period_invalid' using errcode='22023'; end if;
  return query with snapshot as (select * from public._leaderboard_snapshot(p_period,p_section,p_grade)),mine as (select * from snapshot where user_id=auth.uid())
    select mine.rank,mine.nickname,mine.avatar,mine.xp,mine.stars,mine.completed_levels,mine.challenge_points,mine.challenges,
      mine.average_accuracy,mine.grade,true,mine.total_count,greatest(coalesce(ahead.xp,mine.xp)-mine.xp,0)::bigint,
      catalog.reward_title_kk,catalog.reward_title_ru
    from mine join public.profiles profile on profile.id=mine.user_id
    left join public.achievement_catalog catalog on catalog.code=profile.selected_title_code
    left join snapshot ahead on ahead.rank=mine.rank-1;
end;
$$;

create or replace function public.get_nearby_leaderboard_v2(p_period text default 'total')
returns table(rank bigint,nickname text,avatar text,xp bigint,stars bigint,completed_levels bigint,challenge_points bigint,challenges bigint,average_accuracy numeric,grade smallint,is_current boolean,total_count bigint,title_kk text,title_ru text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_period not in ('total','week','month') then raise exception 'period_invalid' using errcode='22023'; end if;
  return query with snapshot as (select * from public._leaderboard_snapshot(p_period,null,null)),mine as (select current_row.rank from snapshot current_row where current_row.user_id=auth.uid())
    select row_data.rank,row_data.nickname,row_data.avatar,row_data.xp,row_data.stars,row_data.completed_levels,row_data.challenge_points,
      row_data.challenges,row_data.average_accuracy,row_data.grade,row_data.user_id=auth.uid(),row_data.total_count,
      catalog.reward_title_kk,catalog.reward_title_ru
    from snapshot row_data cross join mine join public.profiles profile on profile.id=row_data.user_id
    left join public.achievement_catalog catalog on catalog.code=profile.selected_title_code
    where row_data.rank between greatest(mine.rank-3,1) and mine.rank+3 order by row_data.rank;
end;
$$;

-- Replace only the current function body; its public signature stays unchanged.
create or replace function public.submit_level_result(p_level_id text,p_accuracy integer,p_mistakes integer,p_submission_id uuid)
returns table(awarded_xp integer,total_xp bigint,total_science_points bigint,total_challenge_points bigint,stars smallint,best_score smallint)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid:=auth.uid(); v_level public.game_levels%rowtype; v_progress public.student_progress%rowtype;
  v_first boolean; v_stars smallint; v_awarded integer:=0; v_existing integer; v_effective_access text;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if public._is_admin(v_user) then raise exception 'admin_read_only' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles profile where profile.id=v_user) then raise exception 'profile_required' using errcode='42501'; end if;
  if p_accuracy not between 0 and 100 or p_mistakes<0 then raise exception 'result_invalid' using errcode='22023'; end if;
  select * into v_level from public.game_levels gl where gl.level_id=p_level_id;
  if not found then raise exception 'unknown_level' using errcode='22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text||':'||p_submission_id::text,0));
  select submission.awarded_xp into v_existing from public.result_submissions submission where submission.submission_id=p_submission_id and submission.user_id=v_user;
  if found then
    return query select v_existing,coalesce(sum(tx.xp),0)::bigint,coalesce(sum(tx.science_points),0)::bigint,coalesce(sum(tx.challenge_points),0)::bigint,progress.stars,progress.best_score
    from public.student_progress progress left join public.xp_transactions tx on tx.user_id=progress.user_id
    where progress.user_id=v_user and progress.level_id=p_level_id group by progress.stars,progress.best_score;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text||':'||p_level_id,0));
  v_stars:=case when p_accuracy>=95 then 3 when p_accuracy>=70 then 2 else 1 end;
  select * into v_progress from public.student_progress progress where progress.user_id=v_user and progress.level_id=p_level_id for update;
  v_first:=not found;
  v_effective_access:=public._effective_learning_access(v_user,case when v_level.is_boss then 'boss' else 'level' end,p_level_id);
  if v_effective_access not in ('open','assigned','completed') then raise exception 'level_locked' using errcode='42501'; end if;

  if v_first then
    insert into public.student_progress(user_id,level_id,best_score,stars,attempts,mistakes) values(v_user,p_level_id,p_accuracy,v_stars,1,p_mistakes);
    insert into public.xp_transactions(user_id,level_id,xp,science_points,challenge_points,reason,transaction_key)
    values(v_user,p_level_id,v_level.base_xp,v_level.science_points,v_level.challenge_points,'level_completion',p_level_id||':completion');
    v_awarded:=v_level.base_xp;
  else
    update public.student_progress progress set best_score=greatest(progress.best_score,p_accuracy),stars=greatest(progress.stars,v_stars),
      attempts=progress.attempts+1,mistakes=progress.mistakes+p_mistakes,updated_at=now()
    where progress.user_id=v_user and progress.level_id=p_level_id;
  end if;

  if v_stars=3 and (v_first or v_progress.stars<3) then
    insert into public.xp_transactions(user_id,level_id,xp,reason,transaction_key) values(v_user,p_level_id,20,'perfect_bonus',p_level_id||':perfect')
    on conflict(user_id,transaction_key) do nothing;
    v_awarded:=v_awarded+20;
  end if;

  insert into public.result_submissions(submission_id,user_id,level_id,accuracy,mistakes,awarded_xp)
  values(p_submission_id,v_user,p_level_id,p_accuracy,p_mistakes,v_awarded);
  perform public._evaluate_achievements(v_user,p_level_id);

  return query select v_awarded,coalesce(sum(tx.xp),0)::bigint,coalesce(sum(tx.science_points),0)::bigint,coalesce(sum(tx.challenge_points),0)::bigint,progress.stars,progress.best_score
  from public.student_progress progress left join public.xp_transactions tx on tx.user_id=progress.user_id
  where progress.user_id=v_user and progress.level_id=p_level_id group by progress.stars,progress.best_score;
end;
$$;

-- Backfill derived progress and newly eligible achievements from authoritative history.
do $$
declare student_row record; trigger_level text;
begin
  for student_row in select profile.id from public.profiles profile join public.user_roles role_row on role_row.user_id=profile.id and role_row.role='student'
  loop
    select progress.level_id into trigger_level from public.student_progress progress where progress.user_id=student_row.id order by progress.updated_at desc limit 1;
    perform public._evaluate_achievements(student_row.id,trigger_level);
  end loop;
end;
$$;

revoke all on function public._award_achievement(uuid,text,text),public._evaluate_achievements(uuid,text) from public,anon,authenticated;
revoke all on function public.get_my_achievements(),public.set_my_profile_title(text),public.get_admin_student_achievements(uuid),public.get_admin_achievement_analytics(),public.get_leaderboard_v2(text,text,smallint,integer,integer),public.get_my_rank_v2(text,text,smallint),public.get_nearby_leaderboard_v2(text) from public,anon;
grant execute on function public.get_my_achievements(),public.set_my_profile_title(text),public.get_leaderboard_v2(text,text,smallint,integer,integer),public.get_my_rank_v2(text,text,smallint),public.get_nearby_leaderboard_v2(text) to authenticated;
grant execute on function public.get_admin_student_achievements(uuid),public.get_admin_achievement_analytics() to authenticated;

commit;
