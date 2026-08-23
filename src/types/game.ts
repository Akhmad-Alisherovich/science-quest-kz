export type Language = 'kk' | 'ru'
export type LocalizedText = { kk: string; ru: string }
export type Route = 'landing' | 'map' | 'level' | 'achievements' | 'profile' | 'leaderboard' | 'boss'
export type GameType = 'matching' | 'classification' | 'sequence' | 'experiment' | 'data' | 'model' | 'challenge'

export interface TermPair {
  term: LocalizedText
  definition: LocalizedText
}

export interface SortItem {
  label: LocalizedText
  category: 0 | 1
}

export interface SortSpec {
  categories: [LocalizedText, LocalizedText]
  items: SortItem[]
}

export interface LabSpec {
  mode: 'experiment' | 'data' | 'model'
  variable: LocalizedText
  unit: string
  values: number[]
  results: number[]
  resultLabel: LocalizedText
  resultUnit: string
  prompt: LocalizedText
  options: LocalizedText[]
  correct: number
  observation: LocalizedText
}

export interface ChallengeSpec {
  scenario: LocalizedText
  options: LocalizedText[]
  correct: number
}

export interface TopicContent {
  id: string
  sectionId: string
  icon: string
  title: LocalizedText
  theory: LocalizedText
  terms: TermPair[]
  sequence: LocalizedText[]
  sort: SortSpec
  lab: LabSpec
  challenge: ChallengeSpec
  hints: [LocalizedText, LocalizedText, LocalizedText]
  explanation: LocalizedText
}

export interface SectionContent {
  id: string
  icon: string
  color: string
  title: LocalizedText
  description: LocalizedText
  bossTitle: LocalizedText
}

export interface GameLevel {
  id: string
  topicId: string
  sectionId: string
  difficulty: 1 | 2 | 3 | 4
  type: GameType
  title: LocalizedText
  instruction: LocalizedText
  xp: number
}

export interface Achievement {
  id: string
  icon: string
  title: LocalizedText
  description: LocalizedText
  category: AchievementCategory
  rarity: AchievementRarity
  hidden?: boolean
  rewardXp: number
  rewardCrystals: number
  rewardTitle?: LocalizedText
  target: number
}

export type AchievementCategory = 'beginning'|'research'|'experiments'|'accuracy'|'logic'|'data'|'streaks'|'error_recovery'|'earth'|'biology'|'physics'|'chemistry'|'astronomy'|'ecology'|'interdisciplinary'|'mastery'|'legendary'
export type AchievementRarity = 'COMMON'|'RARE'|'EPIC'|'LEGENDARY'

export interface AchievementState extends Achievement {
  current: number | null
  unlocked: boolean
  earnedAt: string | null
  selectedTitle: boolean
}

export interface GameProgress {
  name: string
  language: Language
  xp: number
  sciencePoints: number
  challengePoints: number
  levelStars: Record<string, number>
  completedLevels: string[]
  completedBosses: string[]
  currentLevel: string
  achievements: string[]
  mistakes: number
  streak: number
  bestStreak: number
  correctAnswers: number
  sound: boolean
}
