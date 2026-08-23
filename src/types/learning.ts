export type LearningContentType = 'section' | 'topic' | 'level' | 'boss'
export type LearningAccessState = 'open' | 'locked' | 'hidden' | 'assigned' | 'completed'
export type LearningAccessSource = 'admin' | 'assignment' | 'progress' | 'normal'
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue'

export interface LearningAccess {
  contentType: LearningContentType
  contentId: string
  accessState: LearningAccessState
  accessSource: LearningAccessSource
  assignmentId: string | null
}

export interface StudentAssignment {
  assignmentId: string
  title: { kk: string; ru: string }
  description: { kk: string; ru: string }
  availableFrom: string
  dueAt: string | null
  priority: 'normal' | 'priority'
  status: AssignmentStatus
  progressPercent: number
  completedItems: number
  totalItems: number
  bestScore: number
  stars: number
  attempts: number
  completedAt: string | null
  itemType: LearningContentType | null
  itemId: string | null
}

export interface AdminAssignment {
  assignmentId: string
  title: { kk: string; ru: string }
  description: { kk: string; ru: string }
  availableFrom: string
  dueAt: string | null
  priority: 'normal' | 'priority'
  status: 'active' | 'archived'
  progressPercent: number
  bestScore: number
  stars: number
  attempts: number
  targetSummary: string
  itemCount: number
  assignedCount: number
  startedCount: number
  completedCount: number
  averageScore: number
  averageAttempts: number
  totalCount: number
}

export interface AdminContentOverview {
  contentType: LearningContentType
  contentId: string
  sectionId: string
  completedStudents: number
  averageScore: number
  errorRate: number
  averageAttempts: number
  assignedStudents: number
  accessOverrides: number
}

export type AdminRecipientMode = 'all' | 'grades' | 'users'

export interface AdminContentRecipient {
  userId: string
  nickname: string
  displayName: string
  avatar: string
  grade: number | null
  school: string | null
  xp: number
  lastActive: string | null
  accessState: LearningAccessState
  totalCount: number
}

export interface AdminBulkAccessResult {
  affectedStudents: number
  affectedRules: number
  assignmentId: string | null
}

export interface LearningDashboardStats {
  activeAssignments: number
  completedAssignments: number
  averageAssignmentProgress: number
  recentPlayers: number
  overdueStudents: number
  highAttemptStudents: number
}

export interface AssignmentInput {
  titleKk: string
  titleRu: string
  descriptionKk: string
  descriptionRu: string
  availableFrom: string
  dueAt: string | null
  priority: 'normal' | 'priority'
  targetType: 'user' | 'grade' | 'all'
  targetValues: string[]
  items: Array<{ type: LearningContentType; id: string }>
}
