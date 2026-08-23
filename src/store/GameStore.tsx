import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { levels, levelById } from '../content/levels'
import { sections } from '../content/sections'
import { topics } from '../content/topics'
import type { GameProgress, Language } from '../types/game'
import type { CloudGameState } from '../types/leaderboard'
import { enqueueCompetitiveResult } from '../services/leaderboardService'

const STORAGE_KEY = 'science-quest-kz-progress-v1'
const ACTIVE_ACCOUNT_KEY = 'science-quest-kz-active-account-v1'
const accountStorageKey = (userId: string) => `${STORAGE_KEY}:${userId}`

const initialProgress: GameProgress = {
  name: 'Astra', language: 'kk', xp: 0, sciencePoints: 0, challengePoints: 0, levelStars: {}, completedLevels: [], completedBosses: [],
  currentLevel: levels[0].id, achievements: [], mistakes: 0, streak: 0, bestStreak: 0, correctAnswers: 0, sound: true,
}

type GameContextValue = {
  progress: GameProgress
  newAchievement: string | null
  dismissAchievement: () => void
  setLanguage: (language: Language) => void
  setName: (name: string) => void
  toggleSound: () => void
  completeLevel: (levelId: string, stars: number, mistakes: number) => void
  completeBoss: (sectionId: string, mistakes?: number) => void
  isTopicUnlocked: (topicId: string) => boolean
  isLevelUnlocked: (levelId: string) => boolean
  isBossUnlocked: (sectionId: string) => boolean
  resetProgress: () => void
  activateAccount: (userId: string, cloud: CloudGameState, notifyAchievements?: boolean) => void
  deactivateAccount: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

const loadProgress = (): GameProgress => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialProgress
    return { ...initialProgress, ...JSON.parse(raw) as Partial<GameProgress> }
  } catch {
    return initialProgress
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<GameProgress>(loadProgress)
  const [newAchievement, setNewAchievement] = useState<string | null>(null)
  const [activeAccount, setActiveAccount] = useState(() => localStorage.getItem(ACTIVE_ACCOUNT_KEY))

  useEffect(() => { localStorage.setItem(activeAccount ? accountStorageKey(activeAccount) : STORAGE_KEY, JSON.stringify(progress)) }, [progress, activeAccount])
  useLayoutEffect(() => {
    document.documentElement.lang = progress.language
    document.documentElement.dataset.language = progress.language
  }, [progress.language])

  const isBossUnlocked = (sectionId: string) => {
    const ids = topics.filter((topic) => topic.sectionId === sectionId).map((topic) => `${topic.id}-challenge`)
    return ids.every((id) => progress.completedLevels.includes(id))
  }

  const isTopicUnlocked = (topicId: string) => {
    const index = topics.findIndex((topic) => topic.id === topicId)
    if (index <= 0) return true
    const topic = topics[index]
    const previous = topics[index - 1]
    if (previous.sectionId === topic.sectionId) return progress.completedLevels.includes(`${previous.id}-challenge`)
    const previousSectionIndex = sections.findIndex((section) => section.id === topic.sectionId) - 1
    return previousSectionIndex < 0 || progress.completedBosses.includes(sections[previousSectionIndex].id)
  }

  const isLevelUnlocked = (levelId: string) => {
    const level = levelById[levelId]
    if (!level || !isTopicUnlocked(level.topicId)) return false
    const withinTopic = levels.filter((item) => item.topicId === level.topicId)
    const index = withinTopic.findIndex((item) => item.id === levelId)
    return index === 0 || progress.completedLevels.includes(withinTopic[index - 1].id)
  }

  const completeLevel = (levelId: string, stars: number, mistakes: number) => {
    const level = levelById[levelId]
    if (!level) return
    const alreadyComplete = progress.completedLevels.includes(levelId)
    const previousStars = progress.levelStars[levelId] ?? 0
    const perfectBonus = stars === 3 && previousStars < 3 ? 20 : 0
    setProgress((previous) => {
      const draft: GameProgress = {
        ...previous,
        completedLevels: alreadyComplete ? previous.completedLevels : [...previous.completedLevels, levelId],
        levelStars: { ...previous.levelStars, [levelId]: Math.max(previous.levelStars[levelId] ?? 0, stars) },
        xp: previous.xp + (alreadyComplete ? 0 : level.xp) + perfectBonus,
        sciencePoints: previous.sciencePoints + (alreadyComplete ? 0 : 10 + level.difficulty * 5),
        challengePoints: previous.challengePoints + (!alreadyComplete && level.difficulty === 4 ? 30 : 0),
        mistakes: previous.mistakes + mistakes,
        streak: mistakes === 0 ? previous.streak + 1 : 0,
        bestStreak: mistakes === 0 ? Math.max(previous.bestStreak, previous.streak + 1) : previous.bestStreak,
        correctAnswers: previous.correctAnswers + (alreadyComplete ? 0 : 1),
      }
      const currentIndex = levels.findIndex((item) => item.id === levelId)
      const next = levels[currentIndex + 1]
      const isLastInSection = !next || next.sectionId !== level.sectionId
      draft.currentLevel = isLastInSection ? `boss:${level.sectionId}` : next.id
      return draft
    })
    void enqueueCompetitiveResult({ levelId, accuracy: Math.max(0, 100 - mistakes * 15), mistakes })
  }

  const completeBoss = (sectionId: string, mistakes = 0) => {
    const alreadyComplete = progress.completedBosses.includes(sectionId)
    setProgress((previous) => {
      if (previous.completedBosses.includes(sectionId)) return previous
      const sectionIndex = sections.findIndex((section) => section.id === sectionId)
      const nextSection = sections[sectionIndex + 1]
      const nextTopic = nextSection ? topics.find((topic) => topic.sectionId === nextSection.id) : undefined
      const draft: GameProgress = {
        ...previous,
        completedBosses: [...previous.completedBosses, sectionId],
        xp: previous.xp + 250,
        sciencePoints: previous.sciencePoints + 60,
        challengePoints: previous.challengePoints + 50,
        currentLevel: nextTopic ? `${nextTopic.id}-know` : previous.currentLevel,
      }
      return draft
    })
    if (!alreadyComplete) void enqueueCompetitiveResult({ levelId: `boss:${sectionId}`, accuracy: Math.max(0, 100 - mistakes * 10), mistakes })
  }

  const activateAccount = (userId: string, cloud: CloudGameState, notifyAchievements = false) => {
    const storedRaw = localStorage.getItem(accountStorageKey(userId))
    let stored: GameProgress | null = null
    try { stored = storedRaw ? { ...initialProgress, ...JSON.parse(storedRaw) as Partial<GameProgress> } : null } catch { stored = null }
    const seed = stored ?? (activeAccount && activeAccount !== userId ? initialProgress : progress)
    const completedLevels = [...new Set([...seed.completedLevels, ...cloud.completedLevels])]
    const completedBosses = [...new Set([...seed.completedBosses, ...cloud.completedBosses])]
    const levelStars = { ...seed.levelStars }
    for (const [id, stars] of Object.entries(cloud.levelStars)) levelStars[id] = Math.max(levelStars[id] ?? 0, stars)
    let currentLevel = seed.currentLevel
    for (const section of sections) {
      const sectionLevels = levels.filter((level) => level.sectionId === section.id)
      const missing = sectionLevels.find((level) => !completedLevels.includes(level.id))
      if (missing) { currentLevel = missing.id; break }
      if (!completedBosses.includes(section.id)) { currentLevel = `boss:${section.id}`; break }
    }
    if (notifyAchievements && activeAccount === userId) {
      const newlyUnlocked = cloud.achievements.find((code) => !progress.achievements.includes(code))
      if (newlyUnlocked) setNewAchievement(newlyUnlocked)
    }
    setActiveAccount(userId)
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, userId)
    setProgress({
      ...seed,
      levelStars,
      completedLevels,
      completedBosses,
      achievements: [...new Set(cloud.achievements)],
      currentLevel,
      xp: Math.max(seed.xp, cloud.xp),
      sciencePoints: Math.max(seed.sciencePoints, cloud.sciencePoints),
      challengePoints: Math.max(seed.challengePoints, cloud.challengePoints),
      mistakes: Math.max(seed.mistakes, cloud.mistakes),
      streak: cloud.streak,
      bestStreak: Math.max(seed.bestStreak, cloud.bestStreak),
      correctAnswers: Math.max(seed.correctAnswers, completedLevels.length),
    })
  }

  const deactivateAccount = () => {
    const preferences = { language: progress.language, sound: progress.sound }
    setActiveAccount(null)
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY)
    setNewAchievement(null)
    setProgress({ ...initialProgress, ...preferences })
  }

  const value = useMemo<GameContextValue>(() => ({
    progress, newAchievement, dismissAchievement: () => setNewAchievement(null),
    setLanguage: (language) => setProgress((state) => ({ ...state, language })),
    setName: (name) => setProgress((state) => ({ ...state, name: name.trim() || state.name })),
    toggleSound: () => setProgress((state) => ({ ...state, sound: !state.sound })),
    completeLevel, completeBoss, isTopicUnlocked, isLevelUnlocked, isBossUnlocked,
    resetProgress: () => setProgress(initialProgress), activateAccount, deactivateAccount,
  // The predicates intentionally depend on the current persisted progress.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [progress, newAchievement])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used inside GameProvider')
  return context
}
