import { isLeaderboardConfigured, supabase } from '../lib/supabase'
import type { BackendDiagnostics, CloudGameState, CompetitiveResult, LeaderboardEntry, LeaderboardPeriod, MyLeaderboardRank, OnlineProfile, OnlineProfileInput, ScienceAvatar } from '../types/leaderboard'

const PENDING_KEY = 'science-quest-kz-leaderboard-pending-v1'
export const LEADERBOARD_UPDATED_EVENT = 'science-quest-kz-leaderboard-updated'
export const QUEUE_UPDATED_EVENT = 'science-quest-kz-queue-updated'

type RpcRow = Record<string, unknown>
type QueuedCompetitiveResult = CompetitiveResult & { ownerId?: string }

const numberValue = (value: unknown) => Number(value ?? 0)
const mapEntry = (row: RpcRow): LeaderboardEntry => ({
  rank: numberValue(row.rank),
  nickname: String(row.nickname ?? ''),
  avatar: String(row.avatar ?? '🧑‍🔬'),
  xp: numberValue(row.xp),
  stars: numberValue(row.stars),
  completedLevels: numberValue(row.completed_levels),
  challengePoints: numberValue(row.challenge_points),
  challenges: numberValue(row.challenges),
  averageAccuracy: numberValue(row.average_accuracy),
  grade: row.grade == null ? null : numberValue(row.grade),
  isCurrent: Boolean(row.is_current),
  totalCount: numberValue(row.total_count),
  title: row.title_kk && row.title_ru ? { kk: String(row.title_kk), ru: String(row.title_ru) } : null,
})

const mapProfile = (row: RpcRow): OnlineProfile => ({
  id: String(row.id),
  nickname: String(row.nickname),
  displayName: String(row.display_name),
  grade: row.grade == null ? null : numberValue(row.grade),
  school: row.school == null ? null : String(row.school),
  avatar: String(row.avatar ?? '🧑‍🔬') as ScienceAvatar,
  avatarPath: row.avatar_path == null ? null : String(row.avatar_path),
  showGrade: Boolean(row.show_grade),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  selectedTitleCode: row.selected_title_code == null ? null : String(row.selected_title_code),
})

const getPending = (): QueuedCompetitiveResult[] => {
  if (typeof localStorage === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as QueuedCompetitiveResult[] }
  catch { return [] }
}

const setPending = (items: QueuedCompetitiveResult[]) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-120)))
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(QUEUE_UPDATED_EVENT, { detail: { pending: items.length } }))
}

export const getPendingResultCount = () => getPending().length

const queueResult = (result: QueuedCompetitiveResult) => {
  const items = getPending()
  if (!items.some((item) => item.submissionId === result.submissionId)) setPending([...items, result])
}

const createSubmissionId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const validateNickname = (nickname: string) => /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі0-9_-]{3,20}$/u.test(nickname.trim())

export async function requireAuthenticatedUser() {
  if (!supabase) throw new Error('LEADERBOARD_NOT_CONFIGURED')
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (data.session) return data.session.user
  throw new Error('AUTHENTICATION_REQUIRED')
}

export async function checkBackendConnection(): Promise<BackendDiagnostics> {
  const result: BackendDiagnostics = { configured: isLeaderboardConfigured, auth: false, database: false, leaderboard: false, pendingQueue: getPendingResultCount(), checkedAt: new Date().toISOString() }
  if (!supabase) {
    if (import.meta.env.DEV) console.info('Supabase backend is not configured.')
    return result
  }
  try {
    await requireAuthenticatedUser()
    result.auth = true
  } catch {
    if (import.meta.env.DEV) console.info('[Auth] Authenticated session unavailable')
    return result
  }
  const database = await supabase.from('game_levels').select('level_id', { count: 'exact', head: true })
  result.database = !database.error && (database.count ?? 0) >= 98
  if (result.database) {
    const health = await supabase.rpc('check_leaderboard_health')
    result.leaderboard = !health.error && Boolean((health.data as RpcRow[] | null)?.[0]?.ok)
  }
  if (import.meta.env.DEV) {
    console.info(result.database ? '[Supabase] Connected' : '[Supabase] Database unavailable')
    console.info(result.auth ? '[Auth] Authenticated session available' : '[Auth] Error')
    console.info(result.leaderboard ? '[Leaderboard] RPC available' : '[Leaderboard] RPC unavailable')
  }
  return result
}

export async function fetchOnlineProfile(): Promise<OnlineProfile | null> {
  if (!supabase) return null
  const user = await requireAuthenticatedUser()
  const { data, error } = await supabase.from('profiles').select('id,nickname,display_name,grade,school,avatar,avatar_path,show_grade,created_at,updated_at,selected_title_code').eq('id', user.id).maybeSingle()
  if (error) throw error
  return data ? mapProfile(data as RpcRow) : null
}

export async function fetchCloudGameState(): Promise<CloudGameState> {
  if (!supabase) throw new Error('LEADERBOARD_NOT_CONFIGURED')
  await requireAuthenticatedUser()
  const [progress, transactions, achievements, submissions] = await Promise.all([
    supabase.from('student_progress').select('level_id,stars,mistakes'),
    supabase.from('xp_transactions').select('xp,science_points,challenge_points'),
    supabase.from('student_achievements').select('achievement_code'),
    supabase.from('result_submissions').select('mistakes,created_at').order('created_at', { ascending: true }),
  ])
  const error = progress.error ?? transactions.error ?? achievements.error ?? submissions.error
  if (error) throw error
  const levelStars: Record<string, number> = {}
  const completedLevels: string[] = []
  const completedBosses: string[] = []
  let mistakes = 0
  for (const row of progress.data ?? []) {
    const id = String(row.level_id)
    mistakes += Number(row.mistakes ?? 0)
    if (id.startsWith('boss:')) completedBosses.push(id.slice(5))
    else { completedLevels.push(id); levelStars[id] = Number(row.stars ?? 1) }
  }
  let streak = 0
  let bestStreak = 0
  for (const row of submissions.data ?? []) {
    streak = Number(row.mistakes ?? 0) === 0 ? streak + 1 : 0
    bestStreak = Math.max(bestStreak, streak)
  }
  return {
    levelStars,
    completedLevels,
    completedBosses,
    achievements: (achievements.data ?? []).map((row) => String(row.achievement_code)),
    xp: (transactions.data ?? []).reduce((sum, row) => sum + Number(row.xp ?? 0), 0),
    sciencePoints: (transactions.data ?? []).reduce((sum, row) => sum + Number(row.science_points ?? 0), 0),
    challengePoints: (transactions.data ?? []).reduce((sum, row) => sum + Number(row.challenge_points ?? 0), 0),
    mistakes,
    streak,
    bestStreak,
  }
}

export async function saveOnlineProfile(input: OnlineProfileInput): Promise<OnlineProfile> {
  if (!supabase) throw new Error('LEADERBOARD_NOT_CONFIGURED')
  if (!validateNickname(input.nickname)) throw new Error('NICKNAME_INVALID')
  await requireAuthenticatedUser()
  const { error } = await supabase.rpc('save_profile_with_avatar', {
    p_nickname: input.nickname.trim(),
    p_display_name: input.displayName.trim(),
    p_grade: input.grade,
    p_school: input.school?.trim() || null,
    p_avatar: input.avatar,
    p_avatar_path: input.avatarPath,
    p_show_grade: input.showGrade,
  })
  if (error) {
    if (error.code === '23505' || /nickname_taken/i.test(error.message)) throw new Error('NICKNAME_TAKEN')
    throw error
  }
  const profile = await fetchOnlineProfile()
  if (!profile) throw new Error('PROFILE_SAVE_FAILED')
  await flushPendingResults()
  return profile
}

export async function fetchLeaderboard(period: LeaderboardPeriod, sectionId: string | null, grade: number | null, page = 0): Promise<LeaderboardEntry[]> {
  if (!supabase) return []
  await requireAuthenticatedUser()
  const { data, error } = await supabase.rpc('get_leaderboard_v2', {
    p_period: period,
    p_section: sectionId,
    p_grade: grade,
    p_limit: 50,
    p_offset: Math.max(0, page) * 50,
  })
  if (error) throw error
  return ((data ?? []) as RpcRow[]).map(mapEntry)
}

export async function fetchMyRank(period: LeaderboardPeriod, sectionId: string | null, grade: number | null): Promise<MyLeaderboardRank | null> {
  if (!supabase) return null
  await requireAuthenticatedUser()
  const { data, error } = await supabase.rpc('get_my_rank_v2', { p_period: period, p_section: sectionId, p_grade: grade })
  if (error) throw error
  const row = ((data ?? []) as RpcRow[])[0]
  return row ? { ...mapEntry(row), xpToNext: numberValue(row.xp_to_next) } : null
}

export async function fetchNearbyRivals(period: LeaderboardPeriod = 'total'): Promise<LeaderboardEntry[]> {
  if (!supabase) return []
  await requireAuthenticatedUser()
  const { data, error } = await supabase.rpc('get_nearby_leaderboard_v2', { p_period: period })
  if (error) throw error
  return ((data ?? []) as RpcRow[]).map(mapEntry)
}

async function submitNow(result: CompetitiveResult) {
  if (!supabase) throw new Error('LEADERBOARD_NOT_CONFIGURED')
  await requireAuthenticatedUser()
  const before = await fetchMyRank('total', null, null).catch(() => null)
  const { data, error } = await supabase.rpc('submit_level_result', {
    p_level_id: result.levelId,
    p_accuracy: Math.max(0, Math.min(100, Math.round(result.accuracy))),
    p_mistakes: Math.max(0, Math.round(result.mistakes)),
    p_submission_id: result.submissionId,
  })
  if (error) throw error
  const after = await fetchMyRank('total', null, null).catch(() => null)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LEADERBOARD_UPDATED_EVENT, { detail: { before: before?.rank ?? null, after: after?.rank ?? null, award: (data as RpcRow[] | null)?.[0] ?? null } }))
  return data
}

export async function enqueueCompetitiveResult(input: CompetitiveResult) {
  const submissionId = input.submissionId ?? createSubmissionId()
  const session = supabase ? await supabase.auth.getSession().catch(() => ({ data: { session: null } })) : null
  const ownerId = session?.data.session?.user.id
  if (!ownerId) return
  const result: QueuedCompetitiveResult = { ...input, submissionId, ownerId }
  if (!isLeaderboardConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    queueResult(result)
    return
  }
  try { await submitNow(result) }
  catch { queueResult(result) }
}

export async function flushPendingResults() {
  if (!isLeaderboardConfigured || !supabase || (typeof navigator !== 'undefined' && !navigator.onLine)) return
  const user = await requireAuthenticatedUser()
  const pending = getPending()
  const remaining: QueuedCompetitiveResult[] = pending.filter((item) => item.ownerId && item.ownerId !== user.id)
  for (const item of pending.filter((queued) => !queued.ownerId || queued.ownerId === user.id)) {
    try { await submitNow(item) }
    catch { remaining.push({ ...item, ownerId: user.id }) }
  }
  setPending(remaining)
}
