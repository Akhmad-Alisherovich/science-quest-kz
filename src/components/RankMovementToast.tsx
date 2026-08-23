import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'
import { useOnline } from '../store/OnlineStore'

export function RankMovementToast() {
  const { progress } = useGame()
  const { rankMovement, dismissRankMovement } = useOnline()
  if (!rankMovement) return null
  const copy = ui(progress.language)
  return <button className="rank-movement-toast" onClick={dismissRankMovement} aria-label={copy.closeMenu}>
    <span>🎉</span><strong>▲ +{rankMovement} {copy.position}</strong><small>{copy.rankUp.replace('{count}', String(rankMovement))}</small>
  </button>
}
