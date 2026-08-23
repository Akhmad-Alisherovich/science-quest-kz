import { achievementById, rarityLabel } from '../content/achievements'
import { useEffect } from 'react'
import { useGame } from '../store/GameStore'
import { useSound } from '../hooks/useSound'

export function AchievementModal() {
  const { progress, newAchievement, dismissAchievement } = useGame()
  const sound = useSound()
  const achievement = newAchievement ? achievementById[newAchievement] : undefined
  useEffect(() => { if (achievement) sound('achievement') }, [achievement, sound])
  if (!achievement) return null
  const kk = progress.language === 'kk'
  const view = () => {
    dismissAchievement()
    window.history.pushState({}, '', '/achievements')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  return <aside className={`achievement-toast rarity-${achievement.rarity.toLowerCase()}`} role="status" aria-live="polite">
    <button className="achievement-toast-close" onClick={dismissAchievement} aria-label={kk?'Жабу':'Закрыть'}>×</button>
    <span className="achievement-toast-icon">{achievement.icon}</span>
    <div><small>🏆 {kk?'Жаңа жетістік!':'Новое достижение!'} · {rarityLabel(achievement.rarity,progress.language)}</small><h2>{achievement.title[progress.language]}</h2><p>+{achievement.rewardXp} XP{achievement.rewardCrystals>0?` · +${achievement.rewardCrystals} 💎`:''}</p><button onClick={view}>{kk?'Жетістікті көру':'Посмотреть'}</button></div>
  </aside>
}
