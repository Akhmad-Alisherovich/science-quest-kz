import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const migration = read('supabase/migrations/202608230001_registration_phone_contact.sql')
const migration1 = read('supabase/migrations/202608220001_leaderboard.sql')
const authPage = read('src/auth/AuthPage.tsx')
const authStore = read('src/store/AuthStore.tsx')
const authService = read('src/services/authService.ts')
const contactService = read('src/services/privateContactService.ts')
const profileForm = read('src/components/OnlineProfileForm.tsx')
const adminStudents = read('src/admin/AdminStudents.tsx')
const adminDetail = read('src/admin/AdminStudentDetail.tsx')
const adminService = read('src/services/adminService.ts')
const activityMigration = read('supabase/migrations/202608220002_auth_admin.sql')
const runtime = [authPage, authStore, authService, contactService, profileForm, adminStudents, adminDetail, adminService].join('\n')

const checks = [
  ['migration is additive', !/^\s*(drop\s+table|truncate|delete\s+from|alter\s+table\s+public\.profiles)\b/im.test(migration)],
  ['phone is stored outside public profiles', /create table if not exists public\.user_private_contacts/.test(migration) && !/add\s+(column\s+)?phone/i.test(migration)],
  ['E.164 is enforced by SQL', /private_contact_phone_e164[\s\S]*?\^\\\+\[1-9\]\[0-9\]\{7,14\}\$/.test(migration)],
  ['private table has RLS and own-only policies', /user_private_contacts enable row level security/.test(migration) && /using \(user_id = auth\.uid\(\)\)/.test(migration) && /with check \(user_id = auth\.uid\(\)\)/.test(migration)],
  ['anonymous role has no table or RPC access', /revoke all on public\.user_private_contacts from anon, authenticated/.test(migration) && /revoke all on function public\.get_my_private_contact\(\) from public, anon/.test(migration)],
  ['admin contact RPC checks server role', /get_admin_student_contact[\s\S]*?if not public\._is_admin\(\)/.test(migration)],
  ['signup trigger captures and removes temporary metadata', /before insert on auth\.users/.test(migration) && /registration_phone/.test(migration) && /raw_user_meta_data[\s\S]*?- 'registration_phone'/.test(migration)],
  ['phone OTP APIs and UI are absent', !/signInWithOtp|verifyOtp|requestPhoneOtp|confirmPhoneOtp|AuthMethod|otpSent|one-time-code/.test(runtime)],
  ['registration requires a contact phone', /tab === 'register'[\s\S]*?phoneRequired/.test(authPage) && /type="tel"/.test(authPage) && /inputMode="tel"/.test(authPage) && /autoComplete="tel"/.test(authPage) && /required/.test(authPage)],
  ['login remains email and password only', /tab === 'register' && !recovery[\s\S]*?type="tel"/.test(authPage) && /hideRepeat=\{tab === 'login'\}/.test(authPage)],
  ['phone normalization is shared and E.164 validated', /replace\(\/\[\\s\(\)-\]\/g, ''\)/.test(contactService) && /\^\\\+\[1-9\]\\d\{7,14\}\$/.test(contactService)],
  ['signup requires an immediate authenticated session', /auth\.signUp[\s\S]*?!data\.session[\s\S]*?REGISTRATION_SESSION_MISSING/.test(authService)],
  ['development signup diagnostics expose Supabase result', /import\.meta\.env\.DEV[\s\S]*?console\.log\('SIGNUP ERROR', error\)[\s\S]*?console\.log\('SIGNUP USER', data\?\.user\)[\s\S]*?console\.log\('SIGNUP SESSION', data\?\.session\)/.test(authService)],
  ['Supabase signup errors retain message and code', /tab === 'register'[\s\S]*?rawMessage[\s\S]*?rawCode/.test(authPage)],
  ['missing signup session has an actionable message', /Аккаунт құрылды, бірақ автоматты кіру сессиясы жасалмады/.test(read('src/content/auth.ts'))],
  ['contact is saved for the active signup session', /registration_phone: normalizedPhone/.test(authService) && /data\.session[\s\S]*?saveMyPrivateContact\(normalizedPhone\)/.test(authService)],
  ['signup confirmation state and resend are absent', !/confirmationRequired|resendConfirmation|emailConfirmation|PENDING_EMAIL_KEY|auth\.resend/.test(runtime)],
  ['registration contact is never stored in browser storage', !/(localStorage|sessionStorage)\.(setItem|getItem)\([^,\n]*(phone|contact)/i.test(runtime)],
  ['password is never persisted with pending registration', !/(localStorage|sessionStorage)\.setItem\([^,]+,\s*password/i.test(runtime)],
  ['password recovery remains independent', /resetPasswordForEmail/.test(authService) && /PASSWORD_RECOVERY/.test(authStore)],
  ['phone is editable in own profile', /saveMyPrivateContact/.test(contactService) && /normalizePhone\(phone\)/.test(profileForm)],
  ['phone is absent from leaderboard schema and RPC', !/\bphone\b/i.test(migration1)],
  ['phone is absent from activity metadata', !/jsonb_build_object\([^)]*phone/i.test(activityMigration)],
  ['student list remains contact-free', !/fetchAdminStudentContact|get_admin_student_contact/.test(adminStudents)],
  ['admin detail uses dedicated protected contact RPC', /fetchAdminStudentContact/.test(adminDetail) && /rpc\('get_admin_student_contact'/.test(adminService)],
]

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
if (failed) {
  console.error(`Registration contact QA failed: ${failed} check(s).`)
  process.exit(1)
}
console.log(`Registration contact QA passed: ${checks.length} checks.`)
