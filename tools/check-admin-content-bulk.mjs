import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const migration = read('supabase/migrations/202608230005_admin_content_bulk_access.sql')
const control = read('src/admin/AdminContentControl.tsx')
const selector = read('src/admin/AdminRecipientSelector.tsx')
const detail = read('src/admin/AdminStudentLearningDetail.tsx') + read('src/admin/AdminStudentContentActions.tsx') + read('src/admin/AdminInlineAccess.tsx')
const service = read('src/services/learningService.ts')
const css = read('src/admin.css')

const checks = [
  ['new additive migration exists', migration.startsWith('begin;') && migration.trimEnd().endsWith('commit;')],
  ['server recipient modes all grades users', ['all','grades','users'].every((mode) => migration.includes(`'${mode}'`))],
  ['bulk RPC enforces admin role', /admin_bulk_set_content_access[\s\S]+?if not public\._is_admin\(\)/.test(migration)],
  ['content and state are validated server-side', /content_not_found/.test(migration) && /access_state_invalid/.test(migration)],
  ['bulk write expands recipients server-side', /_admin_selected_students/.test(migration) && /unnest\(v_student_ids\)/.test(migration)],
  ['frontend performs one bulk RPC', service.includes("rpc('admin_bulk_set_content_access'") && !/for \(const target[\s\S]+?setAdminContentAccess/.test(control)],
  ['assigned uses existing assignment system', ['public.assignments','public.assignment_targets','public.assignment_items','_refresh_assignment_progress'].every((term) => migration.includes(term))],
  ['bulk actions are audited', /admin_learning_audit/.test(migration) && /ADMIN_CONTENT_ASSIGNED/.test(migration)],
  ['no progress XP or achievement deletion', !/delete from public\.(student_progress|xp_transactions|student_achievements)/i.test(migration)],
  ['recipient selector has three modes', ['Барлық оқушы','Сыныптар','Нақты оқушылар'].every((term) => selector.includes(term))],
  ['search grade and activity filters exist', /search/.test(selector) && /grade/.test(selector) && /active/.test(selector)],
  ['visible select and deselect exist', /selectVisible/.test(selector) && /deselectVisible/.test(selector)],
  ['recipient count is server-confirmed', /countAdminContentRecipients/.test(selector) && /pending\.count/.test(control)],
  ['confirmation precedes bulk mutation', /AdminConfirmDialog/.test(control) && /onConfirm/.test(control)],
  ['student detail has exact topic and quest controls', /mode="topics"/.test(detail) && /mode="quests"/.test(detail) && /targetMode: 'users'/.test(detail)],
  ['right panel desktop width contract', /minmax\(360px,400px\)/.test(css)],
  ['selector is fullscreen on mobile', /@media\(max-width:639px\)[\s\S]+?height:100dvh/.test(css)],
  ['tabs remain horizontally scrollable', /\.admin-detail-tabs[^}]+overflow-x:auto/.test(css)],
  ['button labels cannot break by character', /\.admin-shell button[^}]+word-break:normal[^}]+overflow-wrap:normal/.test(css)],
]

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
if (failed) {
  console.error(`Admin content bulk QA failed: ${failed} check(s).`)
  process.exit(1)
}
console.log(`Admin content bulk static QA passed: ${checks.length} checks.`)
