import { supabase } from '../lib/supabase'
import type { AdminAchievement, AdminAchievementAnalytics, AdminActivity, AdminDailyAnalytics, AdminDashboardStats, AdminLevelHistory, AdminSectionProgress, AdminStudent, AdminStudentDetail, AdminWeakTopic } from '../types/admin'
import type { LeaderboardEntry, LeaderboardPeriod } from '../types/leaderboard'

type Row = Record<string, unknown>
const client = () => { if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED'); return supabase }
const n = (value: unknown) => Number(value ?? 0)
const s = (value: unknown) => String(value ?? '')

export async function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  const { data, error } = await client().rpc('get_admin_dashboard'); if (error) throw error
  const row = (data?.[0] ?? {}) as Row
  return { totalStudents: n(row.total_students), activeToday: n(row.active_today), activeWeek: n(row.active_week), completedLevels: n(row.completed_levels), averageXp: n(row.average_xp), averageAccuracy: n(row.average_accuracy), challenges: n(row.challenges), grade5: n(row.grade_5), grade6: n(row.grade_6) }
}

const mapStudent = (row: Row): AdminStudent => ({ userId: s(row.user_id), nickname: s(row.nickname), avatar: s(row.avatar), grade: row.grade == null ? null : n(row.grade), school: row.school == null ? null : s(row.school), xp: n(row.xp), rank: n(row.rank), stars: n(row.stars), completedLevels: n(row.completed_levels), averageAccuracy: n(row.average_accuracy), lastActive: row.last_active == null ? null : s(row.last_active), registeredAt: s(row.registered_at), totalCount: n(row.total_count) })

export async function fetchAdminStudents(filters: { search: string; grade: number | null; active: string; sort: string; page: number }): Promise<AdminStudent[]> {
  const { data, error } = await client().rpc('get_admin_students', { p_search: filters.search || null, p_grade: filters.grade, p_active: filters.active, p_sort: filters.sort, p_limit: 50, p_offset: filters.page * 50 })
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapStudent)
}

export async function fetchAdminStudentDetail(userId: string): Promise<AdminStudentDetail | null> {
  const { data, error } = await client().rpc('get_admin_student_detail', { p_user_id: userId }); if (error) throw error
  const row = (data?.[0] ?? null) as Row | null
  return row ? { ...mapStudent({ ...row, total_count: 1 }), totalLevels: n(row.total_levels), currentStreak: n(row.current_streak) } : null
}

export async function fetchAdminStudentContact(userId: string): Promise<string | null> {
  const { data, error } = await client().rpc('get_admin_student_contact', { p_user_id: userId })
  if (error) throw error
  const row = (data?.[0] ?? null) as Row | null
  return row?.phone == null ? null : s(row.phone)
}

export async function fetchAdminStudentProgress(userId: string): Promise<AdminSectionProgress[]> {
  const { data, error } = await client().rpc('get_admin_student_progress', { p_user_id: userId }); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ sectionId: s(row.section_id), completedLevels: n(row.completed_levels), totalLevels: n(row.total_levels), completionPercent: n(row.completion_percent), stars: n(row.stars), averageScore: n(row.average_score), mistakes: n(row.mistakes) }))
}

export async function fetchAdminStudentHistory(userId: string): Promise<AdminLevelHistory[]> {
  const { data, error } = await client().rpc('get_admin_student_history', { p_user_id: userId, p_limit: 100, p_offset: 0 }); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ levelId: s(row.level_id), completedAt: s(row.completed_at), accuracy: n(row.accuracy), stars: n(row.stars), attemptNumber: n(row.attempt_number), xpEarned: n(row.xp_earned), totalCount: n(row.total_count) }))
}

export async function fetchAdminActivity(filters: { days: number; eventType: string | null; grade: number | null; page: number; userId?: string | null; search?: string }): Promise<AdminActivity[]> {
  const { data, error } = await client().rpc('get_admin_activity', { p_days: filters.days, p_event_type: filters.eventType, p_user_id: filters.userId ?? null, p_grade: filters.grade, p_search: filters.search || null, p_limit: 50, p_offset: filters.page * 50 }); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ id: n(row.id), userId: s(row.user_id), nickname: s(row.nickname), avatar: s(row.avatar), grade: row.grade == null ? null : n(row.grade), eventType: s(row.event_type), levelId: row.level_id == null ? null : s(row.level_id), metadata: (row.metadata ?? {}) as Record<string, unknown>, createdAt: s(row.created_at), totalCount: n(row.total_count) }))
}

export async function fetchAdminDailyAnalytics(days = 14): Promise<AdminDailyAnalytics[]> {
  const { data, error } = await client().rpc('get_admin_daily_analytics', { p_days: days }); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ day: s(row.day), activeStudents: n(row.active_students), completedLevels: n(row.completed_levels), averageAccuracy: n(row.average_accuracy), xpEarned: n(row.xp_earned) }))
}

export async function fetchAdminWeakTopics(limit = 10): Promise<AdminWeakTopic[]> {
  const { data, error } = await client().rpc('get_admin_weak_topics', { p_limit: limit }); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ levelId: s(row.level_id), averageScore: n(row.average_score), errorRate: n(row.error_rate), attemptCount: n(row.attempt_count), completionCount: n(row.completion_count) }))
}

export async function fetchAdminStudentAchievements(userId: string): Promise<AdminAchievement[]> {
  const { data, error } = await client().rpc('get_admin_student_achievements', { p_user_id: userId }); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ code:s(row.code),category:s(row.category),rarity:s(row.rarity),title:{kk:s(row.title_kk),ru:s(row.title_ru)},icon:s(row.icon),current:n(row.current_value),target:n(row.target_value),unlocked:Boolean(row.unlocked),earnedAt:row.earned_at==null?null:s(row.earned_at),selectedTitle:Boolean(row.selected_title),totalCount:n(row.total_count),unlockedCount:n(row.unlocked_count) }))
}

export async function fetchAdminAchievementAnalytics(): Promise<AdminAchievementAnalytics[]> {
  const { data, error } = await client().rpc('get_admin_achievement_analytics'); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ code:s(row.code),title:{kk:s(row.title_kk),ru:s(row.title_ru)},rarity:s(row.rarity),unlockedStudents:n(row.unlocked_students),totalStudents:n(row.total_students),unlockPercent:n(row.unlock_percent) }))
}

export async function fetchAdminLeaderboard(period: LeaderboardPeriod, section: string | null, grade: number | null, page: number): Promise<LeaderboardEntry[]> {
  const { data, error } = await client().rpc('get_admin_leaderboard', { p_period: period, p_section: section, p_grade: grade, p_limit: 100, p_offset: page * 100 }); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ rank: n(row.rank), nickname: s(row.nickname), avatar: s(row.avatar), xp: n(row.xp), stars: n(row.stars), completedLevels: n(row.completed_levels), challengePoints: n(row.challenge_points), challenges: n(row.challenges), averageAccuracy: n(row.average_accuracy), grade: row.grade == null ? null : n(row.grade), isCurrent: false, totalCount: n(row.total_count), title: null }))
}
