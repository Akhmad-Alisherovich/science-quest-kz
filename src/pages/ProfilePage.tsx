import { useState } from 'react'
import { OnlineProfileForm } from '../components/OnlineProfileForm'
import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'
import { useOnline } from '../store/OnlineStore'
import { getRank } from '../utils/ranks'
import { useAuth } from '../store/AuthStore'
import { authCopy } from '../content/auth'
import { AvatarImage } from '../components/AvatarImage'
import { achievementById } from '../content/achievements'

export function ProfilePage({ onBack, onRegister, onAdmin }: { onBack: () => void; onRegister: () => void; onAdmin: () => void }) {
  const { progress, setName, resetProgress } = useGame()
  const { configured, status, profile } = useOnline()
  const { isAnonymous, role, logout } = useAuth()
  const [name, setLocalName] = useState(progress.name)
  const copy = ui(progress.language)
  const accountCopy = authCopy(progress.language)
  const reset = () => { if (window.confirm(copy.resetConfirm)) resetProgress() }
  const selectedTitle = profile?.selectedTitleCode ? achievementById[profile.selectedTitleCode]?.rewardTitle?.[progress.language] : null

  return <main className="page-container profile-page">
    <button className="back-link" onClick={onBack}>← {copy.back}</button>
    <div className="profile-layout">
      <section className="profile-panel">
        <AvatarImage className="profile-avatar" value={profile?.avatarPath ? `${profile.avatarPath}?v=${new Date(profile.updatedAt).getTime()}` : profile?.avatar} label={profile?.nickname ?? progress.name} /><h1>{profile?.nickname ?? progress.name}</h1>{selectedTitle && <p className="profile-title">✦ {selectedTitle}</p>}<p>{getRank(progress.xp, progress.language)}</p>
        {profile && <p className="profile-school">{profile.grade} · {profile.school || '—'}</p>}
        <label>{copy.enterName}<input value={name} maxLength={24} onChange={(event) => setLocalName(event.target.value)} /></label>
        <button className="primary-button compact" onClick={() => setName(name)}>{copy.save}</button>
        <div className="profile-stats"><span><strong>{progress.xp}</strong> XP</span><span><strong>{Object.values(progress.levelStars).reduce((sum, stars) => sum + stars, 0)}</strong> ⭐</span><span><strong>{progress.completedLevels.length + progress.completedBosses.length}</strong> ✓</span><span><strong>{progress.achievements.length}</strong> 🏆</span><span><strong>{progress.bestStreak}</strong> 🔥</span></div>
        <div className="profile-account-actions">
          {isAnonymous && <button className="primary-button" onClick={onRegister}>{accountCopy.linkAccount}</button>}
          {role === 'admin' && <button className="secondary-button" onClick={onAdmin}>SCIENCE QUEST ADMIN</button>}
          {!isAnonymous && <button className="secondary-button" onClick={() => void logout()}>{accountCopy.logout}</button>}
        </div>
        <button className="danger-button" onClick={reset}>{copy.reset}</button>
      </section>
      <section className="online-profile-panel">
        {configured && status !== 'offline' && status !== 'error' ? <OnlineProfileForm /> : <div className="online-state-card compact"><span>{configured ? '📡' : '🔌'}</span><div><h2>{copy.onlineProfile}</h2><p>{!configured ? copy.leaderboardNotConfigured : status === 'offline' ? copy.leaderboardUnavailable : copy.backendUnavailable}</p></div></div>}
      </section>
    </div>
  </main>
}
