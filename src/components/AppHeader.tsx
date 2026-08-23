import { useEffect, useState } from 'react'
import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'
import { getRank } from '../utils/ranks'
import { LanguageSwitch } from './LanguageSwitch'
import { useMusic } from '../audio/MusicProvider'

interface AppHeaderProps {
  onHome: () => void
  onMap: () => void
  onLeaderboard: () => void
  onAchievements: () => void
  onProfile: () => void
  adminMode?: boolean
  onAdmin?: () => void
}

export function AppHeader({ onHome, onMap, onLeaderboard, onAchievements, onProfile, adminMode = false, onAdmin }: AppHeaderProps) {
  const { progress } = useGame()
  const { enabled: musicEnabled, toggleMusic } = useMusic()
  const [menuOpen, setMenuOpen] = useState(false)
  const copy = ui(progress.language)
  const stars = Object.values(progress.levelStars).reduce((sum, value) => sum + value, 0)
  const musicLabel = progress.language === 'kk'
    ? musicEnabled ? 'Музыканы өшіру' : 'Музыканы қосу'
    : musicEnabled ? 'Выключить музыку' : 'Включить музыку'

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  const navigate = (action: () => void) => {
    setMenuOpen(false)
    action()
  }

  return <header className="app-header">
    <button className="mobile-menu-toggle" onClick={() => setMenuOpen(true)} aria-label={copy.menu} aria-expanded={menuOpen} aria-controls="mobile-game-menu">☰</button>
    <button className="brand-mini" onClick={() => navigate(onHome)}><span>⚛</span><strong>SCIENCE QUEST <em>KZ</em></strong></button>
    <nav className="desktop-header-nav" aria-label={copy.menu}>
      <button onClick={() => navigate(onMap)}>🗺 {copy.map}</button>
      <button onClick={() => navigate(onLeaderboard)}>🏆 {copy.leaderboard}</button>
      <button onClick={() => navigate(onAchievements)}>🏆 {copy.achievements}</button>
      <button onClick={() => navigate(onProfile)}>👤 {copy.profile}</button>
    </nav>
    {adminMode ? <button className="header-admin-return" onClick={onAdmin}>⚙ {progress.language === 'kk' ? 'Әкімші панелі' : 'Админ-панель'}</button> : <div className="header-stats" aria-label={copy.progress}><span>⭐ {stars}</span><span>XP {progress.xp}</span><span className="rank-chip">{getRank(progress.xp, progress.language)}</span></div>}
    <div className="desktop-header-tools">
      <button className="sound-button" onClick={toggleMusic} title={musicLabel} aria-label={musicLabel}>{musicEnabled ? '🔊' : '🔇'}</button>
      <LanguageSwitch />
    </div>
    {menuOpen && <div className="mobile-drawer-backdrop" onClick={() => setMenuOpen(false)}>
      <aside id="mobile-game-menu" className="mobile-drawer" role="dialog" aria-modal="true" aria-label={copy.menu} onClick={(event) => event.stopPropagation()}>
        <div className="mobile-drawer-heading"><strong>SCIENCE QUEST <em>KZ</em></strong><button onClick={() => setMenuOpen(false)} aria-label={copy.closeMenu}>×</button></div>
        <div className="mobile-drawer-progress">{adminMode ? <><span>🛡</span><span>ADMIN</span><strong>{progress.language === 'kk' ? 'Әкімші режимі' : 'Режим администратора'}</strong></> : <><span>⭐ {stars}</span><span>XP {progress.xp}</span><strong>{getRank(progress.xp, progress.language)}</strong></>}</div>
        <nav>
          <button onClick={() => navigate(onHome)}>🏠 <span>{copy.home}</span></button>
          <button onClick={() => navigate(onMap)}>🗺 <span>{copy.map}</span></button>
          <button onClick={() => navigate(onLeaderboard)}>🏆 <span>{copy.leaderboard}</span></button>
          <button onClick={() => navigate(onAchievements)}>🏆 <span>{copy.achievements}</span></button>
          <button onClick={() => navigate(onProfile)}>👤 <span>{copy.profile}</span></button>
          {adminMode && <button onClick={() => onAdmin && navigate(onAdmin)}>⚙ <span>{progress.language === 'kk' ? 'Әкімші панелі' : 'Админ-панель'}</span></button>}
        </nav>
        <div className="mobile-drawer-settings">
          <strong>{copy.settings}</strong>
          <button className="drawer-sound" onClick={toggleMusic} title={musicLabel} aria-label={musicLabel}>{musicEnabled ? '🔊' : '🔇'} <span>{musicLabel}</span></button>
          <LanguageSwitch />
        </div>
      </aside>
    </div>}
  </header>
}
