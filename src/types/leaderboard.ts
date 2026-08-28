import type { LocalizedText } from './game'

export type LeaderboardPeriod = 'total' | 'week' | 'month'

export const scienceAvatars = ['🧑‍🔬', '🚀', '🌍', '🧬', '⚗️', '⚡'] as const
export type ScienceAvatar = typeof scienceAvatars[number]

export interface OnlineProfile {
  id: string
  nickname: string
  displayName: string
  grade: number | null
  school: string | null
  avatar: ScienceAvatar
  avatarPath: string | null
  showGrade: boolean
  createdAt: string
  updatedAt: string
  selectedTitleCode: string | null
}

export interface OnlineProfileInput {
  nickname: string
  displayName: string
  grade: number | null
  school: string | null
  avatar: ScienceAvatar
  avatarPath: string | null
  showGrade: boolean
  phone?: string
}

export interface LeaderboardEntry {
  rank: number
  nickname: string
  avatar: string
  xp: number
  stars: number
  completedLevels: number
  challengePoints: number
  challenges: number
  averageAccuracy: number
  grade: number | null
  isCurrent: boolean
  totalCount: number
  title: LocalizedText | null
}

export interface MyLeaderboardRank extends LeaderboardEntry {
  xpToNext: number
}

export interface CompetitiveResult {
  levelId: string
  accuracy: number
  mistakes: number
  submissionId?: string
}

export type OnlineStatus = 'unconfigured' | 'unauthenticated' | 'connecting' | 'ready' | 'offline' | 'error'

export interface CloudGameState {
  levelStars: Record<string, number>
  completedLevels: string[]
  completedBosses: string[]
  achievements: string[]
  xp: number
  sciencePoints: number
  challengePoints: number
  mistakes: number
  streak: number
  bestStreak: number
}

export interface BackendDiagnostics {
  configured: boolean
  auth: boolean
  database: boolean
  leaderboard: boolean
  pendingQueue: number
  checkedAt: string | null
}
