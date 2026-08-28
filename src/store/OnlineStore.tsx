import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isLeaderboardConfigured } from '../lib/supabase'
import { checkBackendConnection, fetchCloudGameState, fetchOnlineProfile, flushPendingResults, getPendingResultCount, LEADERBOARD_UPDATED_EVENT, QUEUE_UPDATED_EVENT, saveOnlineProfile } from '../services/leaderboardService'
import { fetchMyPrivateContact, saveMyPrivateContact } from '../services/privateContactService'
import type { BackendDiagnostics, OnlineProfile, OnlineProfileInput, OnlineStatus } from '../types/leaderboard'
import { useAuth } from './AuthStore'
import { useGame } from './GameStore'

interface OnlineContextValue {
  configured: boolean
  status: OnlineStatus
  profile: OnlineProfile | null
  phone: string | null
  refreshVersion: number
  rankMovement: number
  diagnostics: BackendDiagnostics
  connect: () => Promise<void>
  saveProfile: (input: OnlineProfileInput) => Promise<void>
  dismissRankMovement: () => void
}

const OnlineContext = createContext<OnlineContextValue | null>(null)

export function OnlineProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { activateAccount, deactivateAccount } = useGame()
  const [status, setStatus] = useState<OnlineStatus>(isLeaderboardConfigured ? 'connecting' : 'unconfigured')
  const [profile, setProfile] = useState<OnlineProfile | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [rankMovement, setRankMovement] = useState(0)
  const [diagnostics, setDiagnostics] = useState<BackendDiagnostics>({ configured: isLeaderboardConfigured, auth: false, database: false, leaderboard: false, pendingQueue: getPendingResultCount(), checkedAt: null })

  const connect = useCallback(async () => {
    if (!isLeaderboardConfigured) { setDiagnostics(await checkBackendConnection()); setStatus('unconfigured'); return }
    if (!session) {
      setProfile(null)
      setPhone(null)
      setRankMovement(0)
      setRefreshVersion(0)
      setDiagnostics({ configured: isLeaderboardConfigured, auth: false, database: false, leaderboard: false, pendingQueue: 0, checkedAt: null })
      deactivateAccount()
      setStatus('unauthenticated')
      return
    }
    if (!navigator.onLine) { setDiagnostics((value) => ({ ...value, pendingQueue: getPendingResultCount(), checkedAt: new Date().toISOString() })); setStatus('offline'); return }
    setStatus('connecting')
    try {
      const health = await checkBackendConnection()
      setDiagnostics(health)
      if (!health.auth || !health.database || !health.leaderboard) { setStatus('error'); return }
      const [currentProfile, cloud, currentPhone] = await Promise.all([fetchOnlineProfile(), fetchCloudGameState(), fetchMyPrivateContact().catch(() => null)])
      setProfile(currentProfile)
      setPhone(currentPhone)
      activateAccount(session.user.id, cloud)
      setStatus('ready')
      if (currentProfile) await flushPendingResults()
    } catch {
      setStatus(navigator.onLine ? 'error' : 'offline')
    }
  // Account activation is intentionally keyed by the stable user id, not by local progress updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  useEffect(() => { void connect() }, [connect])
  useEffect(() => {
    const online = () => void connect()
    const offline = () => setStatus('offline')
    const updated = (event: Event) => {
      const detail = (event as CustomEvent<{ before: number | null; after: number | null }>).detail
      if (detail.before && detail.after && detail.after < detail.before) setRankMovement(detail.before - detail.after)
      setRefreshVersion((value) => value + 1)
      if (session) void fetchCloudGameState().then((cloud) => activateAccount(session.user.id, cloud, true)).catch(() => undefined)
    }
    const queueUpdated = (event: Event) => setDiagnostics((value) => ({ ...value, pendingQueue: Number((event as CustomEvent<{ pending: number }>).detail.pending) }))
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    window.addEventListener(LEADERBOARD_UPDATED_EVENT, updated)
    window.addEventListener(QUEUE_UPDATED_EVENT, queueUpdated)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      window.removeEventListener(LEADERBOARD_UPDATED_EVENT, updated)
      window.removeEventListener(QUEUE_UPDATED_EVENT, queueUpdated)
    }
  }, [connect, session, activateAccount])

  const value = useMemo<OnlineContextValue>(() => ({
    configured: isLeaderboardConfigured,
    status,
    profile,
    phone,
    refreshVersion,
    rankMovement,
    diagnostics,
    connect,
    saveProfile: async (input) => {
      const savedPhone = input.phone ? await saveMyPrivateContact(input.phone) : phone
      const saved = await saveOnlineProfile(input)
      setPhone(savedPhone)
      setProfile(saved)
      setStatus('ready')
      if (session) activateAccount(session.user.id, await fetchCloudGameState())
      setRefreshVersion((value) => value + 1)
    },
    dismissRankMovement: () => setRankMovement(0),
  }), [status, profile, phone, refreshVersion, rankMovement, diagnostics, connect, session, activateAccount])

  return <OnlineContext.Provider value={value}>{children}</OnlineContext.Provider>
}

export function useOnline() {
  const context = useContext(OnlineContext)
  if (!context) throw new Error('useOnline must be used inside OnlineProvider')
  return context
}
