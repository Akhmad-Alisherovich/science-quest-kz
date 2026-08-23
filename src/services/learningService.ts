import { supabase } from '../lib/supabase'
import type { AdminAssignment, AdminBulkAccessResult, AdminContentOverview, AdminContentRecipient, AdminRecipientMode, AssignmentInput, LearningAccess, LearningContentType, LearningDashboardStats, StudentAssignment } from '../types/learning'
import type { AdminStudent } from '../types/admin'

type Row = Record<string, unknown>
const client = () => { if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED'); return supabase }
const n = (value: unknown) => Number(value ?? 0)
const s = (value: unknown) => String(value ?? '')

const mapAccess = (row: Row): LearningAccess => ({
  contentType: s(row.content_type) as LearningAccess['contentType'], contentId: s(row.content_id),
  accessState: s(row.access_state) as LearningAccess['accessState'], accessSource: s(row.access_source) as LearningAccess['accessSource'],
  assignmentId: row.assignment_id == null ? null : s(row.assignment_id),
})

export async function fetchMyContentAccess(): Promise<LearningAccess[]> {
  const { data, error } = await client().rpc('get_my_content_access'); if (error) throw error
  return ((data ?? []) as Row[]).map(mapAccess)
}

export async function fetchMyAssignments(): Promise<StudentAssignment[]> {
  const { data, error } = await client().rpc('get_my_assignments'); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ assignmentId: s(row.assignment_id), title: { kk: s(row.title_kk), ru: s(row.title_ru) }, description: { kk: s(row.description_kk), ru: s(row.description_ru) }, availableFrom: s(row.available_from), dueAt: row.due_at == null ? null : s(row.due_at), priority: s(row.priority) as StudentAssignment['priority'], status: s(row.status) as StudentAssignment['status'], progressPercent: n(row.progress_percent), completedItems: n(row.completed_items), totalItems: n(row.total_items), bestScore: n(row.best_score), stars: n(row.stars), attempts: n(row.attempts), completedAt: row.completed_at == null ? null : s(row.completed_at), itemType: row.item_type == null ? null : s(row.item_type) as LearningContentType, itemId: row.item_id == null ? null : s(row.item_id) }))
}

export async function setAdminContentAccess(targetType: 'user'|'grade'|'all', targetValue: string, contentType: LearningContentType, contentId: string, accessState: 'open'|'locked'|'hidden'|'assigned') {
  const { error } = await client().rpc('admin_set_content_access', { p_target_type: targetType, p_target_value: targetValue, p_content_type: contentType, p_content_id: contentId, p_access_state: accessState }); if (error) throw error
}

export async function clearAdminContentAccess(targetType: 'user'|'grade'|'all', targetValue: string, contentType: LearningContentType, contentId: string) {
  const { error } = await client().rpc('admin_clear_content_access', { p_target_type: targetType, p_target_value: targetValue, p_content_type: contentType, p_content_id: contentId }); if (error) throw error
}

export async function createAdminAssignment(input: AssignmentInput): Promise<string> {
  const { data, error } = await client().rpc('admin_create_assignment', { p_title_kk: input.titleKk, p_title_ru: input.titleRu, p_description_kk: input.descriptionKk, p_description_ru: input.descriptionRu, p_available_from: input.availableFrom, p_due_at: input.dueAt, p_priority: input.priority, p_target_type: input.targetType, p_target_values: input.targetValues, p_item_types: input.items.map((item) => item.type), p_item_ids: input.items.map((item) => item.id) }); if (error) throw error
  return String(data)
}

export async function fetchAdminAssignments(): Promise<AdminAssignment[]> {
  const { data, error } = await client().rpc('admin_get_assignments', { p_status: null, p_limit: 100, p_offset: 0 }); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ assignmentId: s(row.assignment_id), title: { kk: s(row.title_kk), ru: s(row.title_ru) }, description: { kk: s(row.description_kk), ru: s(row.description_ru) }, availableFrom: s(row.available_from), dueAt: row.due_at == null ? null : s(row.due_at), priority: s(row.priority) as AdminAssignment['priority'], status: s(row.status) as AdminAssignment['status'], progressPercent: 0, bestScore: n(row.average_score), stars: 0, attempts: n(row.average_attempts), targetSummary: s(row.target_summary), itemCount: n(row.item_count), assignedCount: n(row.assigned_count), startedCount: n(row.started_count), completedCount: n(row.completed_count), averageScore: n(row.average_score), averageAttempts: n(row.average_attempts), totalCount: n(row.total_count) }))
}

export async function updateAdminAssignment(item: AdminAssignment, changes: Partial<Pick<AdminAssignment, 'status'|'priority'>>): Promise<void> {
  const { error } = await client().rpc('admin_update_assignment', { p_assignment_id: item.assignmentId, p_title_kk: item.title.kk, p_title_ru: item.title.ru, p_description_kk: item.description.kk, p_description_ru: item.description.ru, p_available_from: item.availableFrom, p_due_at: item.dueAt, p_priority: changes.priority ?? item.priority, p_status: changes.status ?? item.status }); if (error) throw error
}

export async function fetchAdminStudentAssignments(userId: string): Promise<StudentAssignment[]> {
  const { data, error } = await client().rpc('admin_get_student_assignments', { p_user_id: userId }); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ assignmentId: s(row.assignment_id), title: { kk: s(row.title_kk), ru: s(row.title_ru) }, description: { kk: '', ru: '' }, availableFrom: '', dueAt: row.due_at == null ? null : s(row.due_at), priority: s(row.priority) as StudentAssignment['priority'], status: s(row.status) as StudentAssignment['status'], progressPercent: n(row.progress_percent), completedItems: 0, totalItems: 0, bestScore: n(row.best_score), stars: n(row.stars), attempts: n(row.attempts), completedAt: row.completed_at == null ? null : s(row.completed_at), itemType: null, itemId: null }))
}

export async function fetchAdminStudentAccess(userId: string): Promise<LearningAccess[]> {
  const { data, error } = await client().rpc('admin_get_student_access', { p_user_id: userId }); if (error) throw error
  return ((data ?? []) as Row[]).map(mapAccess)
}

export async function fetchAdminContentOverview(): Promise<AdminContentOverview[]> {
  const { data, error } = await client().rpc('admin_get_content_overview'); if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({ contentType: s(row.content_type) as LearningContentType, contentId: s(row.content_id), sectionId: s(row.section_id), completedStudents: n(row.completed_students), averageScore: n(row.average_score), errorRate: n(row.error_rate), averageAttempts: n(row.average_attempts), assignedStudents: n(row.assigned_students), accessOverrides: n(row.access_overrides) }))
}

export async function fetchAdminContentRecipients(input: {
  contentType: LearningContentType
  contentId: string
  search?: string
  grade?: number | null
  active?: 'all' | 'today' | 'week'
}): Promise<AdminContentRecipient[]> {
  const { data, error } = await client().rpc('admin_get_content_recipients', {
    p_content_type: input.contentType,
    p_content_id: input.contentId,
    p_search: input.search ?? '',
    p_grade: input.grade ?? null,
    p_active: input.active ?? 'all',
    p_limit: 500,
    p_offset: 0,
  })
  if (error) throw error
  return ((data ?? []) as Row[]).map((row) => ({
    userId: s(row.user_id),
    nickname: s(row.nickname),
    displayName: s(row.display_name),
    avatar: s(row.avatar),
    grade: row.grade == null ? null : n(row.grade),
    school: row.school == null ? null : s(row.school),
    xp: n(row.xp),
    lastActive: row.last_active == null ? null : s(row.last_active),
    accessState: s(row.access_state) as AdminContentRecipient['accessState'],
    totalCount: n(row.total_count),
  }))
}

export async function countAdminContentRecipients(targetMode: AdminRecipientMode, targetValues: string[]): Promise<number> {
  const { data, error } = await client().rpc('admin_count_content_recipients', {
    p_target_mode: targetMode,
    p_target_values: targetValues,
  })
  if (error) throw error
  return n(data)
}

export async function bulkSetAdminContentAccess(input: {
  targetMode: AdminRecipientMode
  targetValues: string[]
  contentType: LearningContentType
  contentId: string
  accessState: 'open' | 'locked' | 'hidden' | 'assigned'
  titleKk: string
  titleRu: string
}): Promise<AdminBulkAccessResult> {
  const { data, error } = await client().rpc('admin_bulk_set_content_access', {
    p_target_mode: input.targetMode,
    p_target_values: input.targetValues,
    p_content_type: input.contentType,
    p_content_id: input.contentId,
    p_access_state: input.accessState,
    p_title_kk: input.titleKk,
    p_title_ru: input.titleRu,
  })
  if (error) throw error
  const row = ((data ?? [])[0] ?? {}) as Row
  return {
    affectedStudents: n(row.affected_students),
    affectedRules: n(row.affected_rules),
    assignmentId: row.assignment_id == null ? null : s(row.assignment_id),
  }
}

export async function fetchLearningDashboard(): Promise<LearningDashboardStats> {
  const { data, error } = await client().rpc('admin_get_learning_dashboard'); if (error) throw error
  const row = (data?.[0] ?? {}) as Row
  return { activeAssignments: n(row.active_assignments), completedAssignments: n(row.completed_assignments), averageAssignmentProgress: n(row.average_assignment_progress), recentPlayers: n(row.recent_players), overdueStudents: n(row.overdue_students), highAttemptStudents: n(row.high_attempt_students) }
}

export async function fetchAdminStudentLearningSummaries(): Promise<Map<string, Partial<AdminStudent>>> {
  const { data, error } = await client().rpc('admin_get_student_learning_summaries'); if (error) throw error
  return new Map(((data ?? []) as Row[]).map((row) => [s(row.user_id), { displayName: s(row.display_name), currentLevelId: row.current_level_id == null ? null : s(row.current_level_id), assignedCount: n(row.assigned_count), pendingAssignments: n(row.pending_assignments), needsAttention: Boolean(row.needs_attention) }]))
}
