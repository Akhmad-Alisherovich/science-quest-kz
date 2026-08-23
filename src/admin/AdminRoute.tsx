import type { ReactNode } from 'react'
import { authCopy } from '../content/auth'
import { useAuth } from '../store/AuthStore'
import { useGame } from '../store/GameStore'

export function AdminRoute({ children, onGame }: { children: ReactNode; onGame: () => void }) {
  const { role, roleLoading } = useAuth(); const { progress } = useGame(); const copy = authCopy(progress.language)
  if (roleLoading) return <main className="admin-state"><span className="admin-spinner" /><p>SCIENCE QUEST ADMIN</p></main>
  if (role !== 'admin') return <main className="admin-state"><span>🔐</span><h1>{copy.accessDenied}</h1><p>{copy.studentOnly}</p><button className="primary-button" onClick={onGame}>{copy.backGame}</button></main>
  return children
}
