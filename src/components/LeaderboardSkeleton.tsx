import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'

export function LeaderboardSkeleton({ compact = false }: { compact?: boolean }) {
  const { progress } = useGame()
  const copy = ui(progress.language)
  return <div className={`leaderboard-skeleton ${compact ? 'compact' : ''}`} role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{copy.leaderboard}…</span>
    {Array.from({ length: compact ? 3 : 6 }).map((_, index) => <div className="skeleton-row" key={index}><i /><span /><b /></div>)}
  </div>
}
