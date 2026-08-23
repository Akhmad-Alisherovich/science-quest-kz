import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const profile = read('src/pages/ProfilePage.tsx')
const status = read('src/components/BackendStatus.tsx')
const admin = read('src/admin/AdminApp.tsx')

const forbidden = ['BackendStatus', 'Supabase', 'Database', 'Offline Queue', 'pending', 'diagnostics', 'DEVELOPMENT ONLY']
const checks = [
  ['student profile does not import diagnostics', !profile.includes("components/BackendStatus")],
  ['student profile does not render diagnostics', !profile.includes('<BackendStatus')],
  ['student profile contains no backend diagnostic labels', forbidden.every((label) => !profile.includes(label))],
  ['health-check implementation remains available', status.includes('diagnostics') && status.includes('connect()')],
  ['diagnostics remain development-only', status.includes('if (!import.meta.env.DEV) return null')],
  ['diagnostics are available only in admin settings UI', admin.includes("view==='settings'") && admin.includes('import.meta.env.DEV') && admin.includes('<BackendStatus />')],
]

const failed = checks.filter(([, ok]) => !ok)
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
if (failed.length) process.exit(1)
console.log(`Student profile privacy QA passed: ${checks.length} checks.`)
