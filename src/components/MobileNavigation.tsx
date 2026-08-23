import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'
import type { Route } from '../types/game'

interface MobileNavigationProps {
  route: Route
  onHome: () => void
  onMap: () => void
  onLeaderboard: () => void
  onAchievements: () => void
  onProfile: () => void
}

export function MobileNavigation({ route, onHome, onMap, onLeaderboard, onAchievements, onProfile }: MobileNavigationProps) {
  const { progress } = useGame()
  const copy = ui(progress.language)
  const mapActive = route === 'map' || route === 'level' || route === 'boss'
  return <nav className="mobile-bottom-nav" aria-label={copy.menu}>
    <button className={route === 'landing' ? 'active' : ''} onClick={onHome}><span>🏠</span><small>{copy.home}</small></button>
    <button className={mapActive ? 'active' : ''} onClick={onMap}><span>🗺</span><small>{copy.map}</small></button>
    <button className={route === 'leaderboard' ? 'active' : ''} onClick={onLeaderboard}><span>🏆</span><small>{copy.leaderboard}</small></button>
    <button className={route === 'achievements' ? 'active' : ''} onClick={onAchievements}><span>🏆</span><small>{copy.achievements}</small></button>
    <button className={route === 'profile' ? 'active' : ''} onClick={onProfile}><span>👤</span><small>{copy.profile}</small></button>
  </nav>
}
