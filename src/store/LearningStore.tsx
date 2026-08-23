import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchMyAssignments, fetchMyContentAccess } from '../services/learningService'
import { LEADERBOARD_UPDATED_EVENT } from '../services/leaderboardService'
import type { LearningAccess, LearningContentType, StudentAssignment } from '../types/learning'
import { useAuth } from './AuthStore'

interface LearningContextValue {
  assignments: StudentAssignment[]
  access: LearningAccess[]
  loading: boolean
  available: boolean
  refresh: () => Promise<void>
  getAccess: (type: LearningContentType, id: string) => LearningAccess | null
}

const LearningContext = createContext<LearningContextValue | null>(null)

export function LearningProvider({ children }: { children: ReactNode }) {
  const { session, role } = useAuth()
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [access, setAccess] = useState<LearningAccess[]>([])
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState(false)

  const refresh = useCallback(async () => {
    if (!session || role !== 'student') { setAssignments([]); setAccess([]); setAvailable(false); return }
    setLoading(true)
    try {
      const [nextAccess, nextAssignments] = await Promise.all([fetchMyContentAccess(), fetchMyAssignments()])
      setAccess(nextAccess); setAssignments(nextAssignments); setAvailable(true)
    } catch {
      // The game remains usable with its existing progression until the new migration is installed or connectivity returns.
      setAvailable(false)
    } finally { setLoading(false) }
  }, [session?.user.id, role])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const onFocus = () => void refresh()
    const timer = window.setInterval(onFocus, 60_000)
    window.addEventListener('focus', onFocus)
    window.addEventListener(LEADERBOARD_UPDATED_EVENT, onFocus)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); window.removeEventListener(LEADERBOARD_UPDATED_EVENT, onFocus) }
  }, [refresh])

  const byKey = useMemo(() => new Map(access.map((item) => [`${item.contentType}:${item.contentId}`, item])), [access])
  const value = useMemo<LearningContextValue>(() => ({ assignments, access, loading, available, refresh, getAccess: (type, id) => byKey.get(`${type}:${id}`) ?? null }), [assignments, access, loading, available, refresh, byKey])
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export const useLearning = () => {
  const value = useContext(LearningContext)
  if (!value) throw new Error('useLearning must be used inside LearningProvider')
  return value
}
