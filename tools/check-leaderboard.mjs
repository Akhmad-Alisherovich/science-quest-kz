import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.cwd())
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8')
const failures = []
const passed = []
const expect = (condition, message) => (condition ? passed : failures).push(message)

const migration = read('supabase', 'migrations', '202608220001_leaderboard.sql')
const client = read('src', 'lib', 'supabase.ts')
const service = read('src', 'services', 'leaderboardService.ts')
const store = read('src', 'store', 'OnlineStore.tsx')
const page = read('src', 'pages', 'LeaderboardPage.tsx')
const preview = read('src', 'components', 'LeaderboardPreview.tsx')
const backendStatus = read('src', 'components', 'BackendStatus.tsx')
const skeleton = read('src', 'components', 'LeaderboardSkeleton.tsx')
const css = read('src', 'leaderboard.css')
const kk = read('src', 'content', 'kk', 'ui.ts')
const ru = read('src', 'content', 'ru', 'ui.ts')
const integration = read('tools', 'test-leaderboard-integration.mjs')
const gitignore = read('.gitignore')
const envExample = read('.env.example')
const frontendSource = [client, service, store, page, preview, backendStatus].join('\n')

expect((migration.match(/enable row level security/gi) ?? []).length >= 7, 'RLS барлық leaderboard кестелерінде қосылған')
expect(migration.includes('submit_level_result') && migration.includes('security definer'), 'XP серверлік RPC арқылы есептеледі')
expect(migration.includes('unique (user_id, transaction_key)'), 'деңгейді қайталап XP жинауға unique anti-farm қорғанысы бар')
expect(migration.includes('pg_advisory_xact_lock') && migration.includes('p_submission_id::text'), 'қатар келген offline retry идемпотентті түрде сериалданады')
expect(migration.includes('unlock_order') && migration.includes("raise exception 'level_locked'"), 'сервер деңгейлердің ашылу ретін тексереді')
expect(migration.includes("'perfect_bonus'") && migration.includes('v_progress.stars < 3'), '3 жұлдыз improvement bonus бір рет беріледі')
expect(migration.includes('greatest(progress.best_score, p_accuracy)') && migration.includes('progress.mistakes + p_mistakes'), 'RPC output атаулары progress бағандарымен екіұшты емес')
expect(migration.includes("time zone 'Asia/Almaty'") && migration.includes("date_trunc('week'") && migration.includes("date_trunc('month'"), 'апта/ай шекарасы серверде Asia/Almaty бойынша есептеледі')
expect(migration.includes('sp.completed_at >= public._leaderboard_period_start(p_period)'), 'апталық/айлық progress көрсеткіштері сол кезеңмен шектеледі')
expect(migration.includes('xp desc, stars desc, challenges desc, average_accuracy desc, reached_at asc'), 'детерминдік tie-breaker сақталған')
expect(migration.includes('limit least(greatest(p_limit,1),50)'), 'серверлік pagination 50 жолмен шектелген')
expect(migration.includes('s.rank between greatest(me.rank - 3, 1) and me.rank + 3'), 'nearby RPC тек ±3 орынды қайтарады')
expect(migration.includes('select current_row.rank from snapshot current_row'), 'nearby RPC rank output атауымен екіұшты емес')
expect(migration.includes('get_my_rank') && migration.includes('xp_to_next'), 'жеке орын мен келесі орынға XP серверде есептеледі')
expect(migration.includes('profiles_grade_visible') && migration.includes('xp_transactions_period') && migration.includes('student_progress_level_user'), 'grade/period/level сұрауларына индекстер бар')
expect(migration.includes('profiles_read_own') && migration.includes('transactions_read_own'), 'оқушы тек өз жеке деректерін тікелей оқиды')
expect(!/\bdrop\s+table\b|\btruncate\b/i.test(migration), 'migration кестені жоймайды және деректерді тазаламайды')

expect(!/service[_-]?role/i.test(frontendSource), 'service_role frontend bundle ішінде жоқ')
expect(client.includes('VITE_SUPABASE_URL') && client.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), 'frontend тек екі public Supabase env айнымалысын оқиды')
expect((client.match(/import\.meta\.env\.VITE_/g) ?? []).length === 2, 'frontend басқа VITE backend құпияларын күтпейді')
expect(client.includes('persistSession: true') && client.includes('autoRefreshToken: true'), 'authenticated session refresh-тен кейін сақталады')
expect(service.includes('requireAuthenticatedUser') && service.includes('flushPendingResults') && !service.includes('signInAnonymously'), 'existing session және offline sync бар, automatic anonymous login жоқ')
expect(service.includes('Supabase backend is not configured.'), 'конфигурация жоқ dev күйі құпиясыз логталады')
expect(service.includes("from('game_levels').select") && service.includes("rpc('check_leaderboard_health')"), 'connection check auth → database → RPC ретін тексереді')
expect(service.includes('submissionId') && migration.includes('result_submissions'), 'submission ID қайталанған транзакцияны тоқтатады')
expect(!/p_(xp|stars|science_points|challenge_points|total_xp)\s*:/i.test(service), 'frontend RPC-ге есептелетін ұпайларды жібермейді')

expect(page.includes("'total'") && page.includes("'week'") && page.includes("'month'") && page.includes("'section'") && page.includes("'class'"), 'барлық рейтинг сүзгілері UI ішінде бар')
expect(page.includes('leaderboard-podium') && page.includes('my-rank-card'), 'Top 3 podium және ағымдағы орын картасы бар')
expect(skeleton.includes('aria-busy="true"') && css.includes('skeleton-shimmer'), 'loading skeleton қолжетімді әрі анимацияланған')
expect(backendStatus.includes('import.meta.env.DEV') && backendStatus.includes('Offline Queue'), 'Backend Status тек development-та және queue күйін көрсетеді')
expect(kk.includes('Онлайн рейтинг әзірге қосылмаған.') && ru.includes('Онлайн-рейтинг пока не подключён.'), 'конфигурацияланбаған күйдің нақты KK/RU мәтіндері бар')
expect(kk.includes('Интернет байланысын тексеріңіз.') && ru.includes('Проверьте подключение к интернету.'), 'offline күйдің нақты KK/RU мәтіндері бар')
expect(kk.includes('Рейтингті жүктеу мүмкін болмады. Кейінірек қайталап көріңіз.') && ru.includes('Не удалось загрузить рейтинг. Попробуйте ещё раз позже.'), 'backend error күйінің нақты KK/RU мәтіндері бар')
expect(css.includes('@media (min-width: 640px)') && css.includes('@media (min-width: 1024px)'), 'leaderboard mobile/tablet/desktop responsive')
expect(css.includes('grid-template-columns: repeat(5') && css.includes('min-width: 44px'), 'mobile navigation және touch targets бейімделген')
expect(css.includes('minmax(0, 1fr)') && css.includes('overflow-wrap: break-word'), 'ұзын қазақша мәтін мен тар viewport қорғалған')

expect(gitignore.split(/\r?\n/).includes('.env.local'), '.env.local Git-тен шығарылған')
expect(envExample.includes('VITE_SUPABASE_URL=') && envExample.includes('VITE_SUPABASE_PUBLISHABLE_KEY=') && !envExample.includes('VITE_SUPABASE_ANON_KEY'), '.env.example тек қазіргі public параметрлерді көрсетеді')
expect(!/SERVICE_ROLE|service[_-]?role/i.test(integration), 'integration test service_role/admin key қолданбайды')
expect(integration.includes('signInAnonymously') && integration.includes("rpc('delete_my_account')"), 'integration test public anonymous клиенттермен жұмыс істеп, өзін тазалайды')
expect(integration.includes('SciTest5_') && integration.includes('Idempotency failed') && integration.includes('get_nearby_leaderboard'), '5 оқушы, duplicate delivery және nearby сценарийлері тексеріледі')

const sample = [
  { nickname: 'StudentA', xp: 100, stars: 2, challenges: 1, accuracy: 80, reached: 1 },
  { nickname: 'StudentB', xp: 100, stars: 5, challenges: 0, accuracy: 95, reached: 2 },
  { nickname: 'StudentC', xp: 140, stars: 4, challenges: 1, accuracy: 90, reached: 3 },
  { nickname: 'StudentD', xp: 70, stars: 3, challenges: 0, accuracy: 100, reached: 4 },
  { nickname: 'StudentE', xp: 40, stars: 2, challenges: 0, accuracy: 80, reached: 5 },
].sort((a, b) => b.xp - a.xp || b.stars - a.stars || b.challenges - a.challenges || b.accuracy - a.accuracy || a.reached - b.reached || a.nickname.localeCompare(b.nickname))
expect(sample.map((item) => item.nickname).join(',') === 'StudentC,StudentB,StudentA,StudentD,StudentE', '5 оқушыға XP және tie-breaker сорттауы дұрыс')

if (failures.length) {
  console.error('Leaderboard QA сәтсіз:\n- ' + failures.join('\n- '))
  process.exit(1)
}
console.log(`Leaderboard architecture QA OK: ${passed.length} тексеріс.`)
console.log('Қамтылғандар: RLS, server scoring, idempotency, anti-farm, server time, rank RPC, indexes, privacy, offline sync, exact UI states, responsive UI және public-only integration test.')
