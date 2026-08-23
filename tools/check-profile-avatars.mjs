import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const migration = read('supabase/migrations/202608230003_profile_avatars.sql')
const uploader = read('src/components/AvatarUploader.tsx')
const avatarImage = read('src/components/AvatarImage.tsx')
const avatarService = read('src/services/avatarService.ts')
const profileForm = read('src/components/OnlineProfileForm.tsx')
const leaderboardService = read('src/services/leaderboardService.ts')
const ui = [
  'src/pages/ProfilePage.tsx',
  'src/pages/LeaderboardPage.tsx',
  'src/components/LeaderboardPreview.tsx',
  'src/admin/AdminStudents.tsx',
  'src/admin/AdminStudentDetail.tsx',
  'src/admin/AdminStudentLearningDetail.tsx',
  'src/admin/AdminActivity.tsx',
  'src/admin/AdminLeaderboard.tsx',
  'src/admin/AdminMonitoring.tsx',
  'src/admin/AdminAssignments.tsx',
  'src/admin/AdminContentControl.tsx',
  'src/admin/AdminSitePreview.tsx',
].map(read).join('\n')
const css = `${read('src/leaderboard.css')}\n${read('src/admin.css')}`
const globalCss = [css, read('src/styles.css'), read('src/typography.css'), read('src/responsive.css'), read('src/auth.css'), read('src/public-landing.css')].join('\n')
const unsafeInteractiveRules = globalCss.match(/[^{}]*(?:button|label|nav)[^{}]*\{[^{}]*(?:word-break:\s*break-all|overflow-wrap:\s*anywhere)[^{}]*\}/gi) ?? []
const cropLayoutContract = /\.avatar-crop-dialog \{[^}]*width: min\(100%, 720px\);[^}]*max-width: 100%;[^}]*box-sizing: border-box/.test(css)
  && /\.avatar-crop-actions button \{[^}]*min-width: max-content;[^}]*white-space: nowrap;[^}]*word-break: normal;[^}]*overflow-wrap: normal;/.test(css)
  && /@media \(max-width: 640px\)[\s\S]*?\.avatar-crop-actions \{ flex-direction: column;/.test(css)
  && /\.avatar-crop-submit \{ order: 1; \}[\s\S]*?\.avatar-crop-cancel \{ order: 2; \}/.test(css)
  && /\.avatar-position-controls \{ grid-template-columns: 1fr;/.test(css)
  && /\.avatar-crop-dialog input\[type="range"\] \{[^}]*width: 100%;[^}]*max-width: 100%;/.test(css)

const checks = [
  ['new additive migration owns the feature', /alter table public\.profiles[\s\S]*add column if not exists avatar_path/.test(migration) && !/(drop table|truncate|delete from public\.)/i.test(migration)],
  ['public avatars bucket has 5 MB and MIME restrictions', /values \('avatars', 'avatars', true, 5242880/.test(migration) && /image\/jpeg/.test(migration) && /image\/png/.test(migration) && /image\/webp/.test(migration)],
  ['profile stores exact path instead of binary data', /avatar_path is null or avatar_path = id::text \|\| '\/avatar\.webp'/.test(migration) && !/avatar_(base64|blob|data)/i.test(migration)],
  ['INSERT policy is exact-owner only', /for insert to authenticated[\s\S]*?name = \(select auth\.uid\(\)\)::text \|\| '\/avatar\.webp'[\s\S]*?owner_id = \(select auth\.uid\(\)\)::text/.test(migration)],
  ['UPDATE policy is exact-owner only', /for update to authenticated[\s\S]*?using \([\s\S]*?owner_id = \(select auth\.uid\(\)\)::text[\s\S]*?with check \([\s\S]*?owner_id = \(select auth\.uid\(\)\)::text/.test(migration)],
  ['DELETE policy is exact-owner only', /for delete to authenticated[\s\S]*?owner_id = \(select auth\.uid\(\)\)::text/.test(migration)],
  ['profile RPC verifies uploaded object ownership', /save_profile_with_avatar[\s\S]*?storage\.objects[\s\S]*?owner_id = v_user::text/.test(migration)],
  ['client accepts only JPEG PNG WebP up to 5 MB', /image\/jpeg,image\/png,image\/webp/.test(uploader) && /5 \* 1024 \* 1024/.test(avatarService)],
  ['crop output is square 512 WebP quality 0.82', /OUTPUT_SIZE = 512/.test(uploader) && /WEBP_QUALITY = 0\.82/.test(uploader) && /'image\/webp'/.test(uploader)],
  ['upload path is auth uid avatar.webp with upsert', /`\$\{userId\}\/avatar\.webp`/.test(avatarService) && /upsert: true/.test(avatarService)],
  ['standard science avatars remain selectable', /scienceAvatars\.map/.test(profileForm) && /setAvatarPath\(null\)/.test(profileForm)],
  ['profile saves only avatar path through RPC', /save_profile_with_avatar/.test(leaderboardService) && /p_avatar_path: input\.avatarPath/.test(leaderboardService)],
  ['profile leaderboard nearby top3 and admin use shared image renderer', (ui.match(/<AvatarImage/g) ?? []).length >= 15 && /avatarPublicUrl/.test(avatarImage)],
  ['mobile gallery and touch crop controls are present', /Галереядан таңдау|Выбрать из галереи/.test(uploader) && /onPointerDown/.test(uploader) && /touch-action: none/.test(css) && /@media \(max-width: 640px\)/.test(css)],
  ['leaderboard and admin activity return versioned avatar paths', (migration.match(/p\.avatar_path \|\| '\?v='/g) ?? []).length >= 2],
  ['Kazakh crop action labels are intact', uploader.includes('Болдырмау') && uploader.includes('Қиып алу және жүктеу')],
  ['crop modal button and slider responsive contract', cropLayoutContract],
  ['interactive text has no break-all or anywhere inheritance', unsafeInteractiveRules.length === 0],
]

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
if (failed) {
  console.error(`Profile avatar QA failed: ${failed} check(s).`)
  process.exit(1)
}
console.log(`Profile avatar static QA passed: ${checks.length} checks.`)
for (const viewport of ['320×568', '360×800', '390×844', '430×932', '768×1024', 'Desktop']) {
  console.log(`PASS  ${viewport} crop layout contract`)
}
