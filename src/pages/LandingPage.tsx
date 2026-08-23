import { levels } from '../content/levels'
import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'
import { getRank } from '../utils/ranks'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { LeaderboardPreview } from '../components/LeaderboardPreview'
import { AvatarImage } from '../components/AvatarImage'
import { useLearning } from '../store/LearningStore'
import { useOnline } from '../store/OnlineStore'
import type { LearningContentType } from '../types/learning'
import { useMusic } from '../audio/MusicProvider'

export function LandingPage({ onStart, onContinue, onLeaderboard, onAchievements, onProfile, onAssignment }: { onStart: () => void; onContinue: () => void; onLeaderboard: () => void; onAchievements: () => void; onProfile: () => void; onAssignment: (type: LearningContentType | null, id: string | null) => void }) {
  const { progress } = useGame()
  const { enabled: musicEnabled, toggleMusic } = useMusic()
  const { assignments } = useLearning()
  const { profile } = useOnline()
  const copy = ui(progress.language)
  const totalComplete = progress.completedLevels.length + progress.completedBosses.length
  const total = levels.length + 6
  const completion = Math.round(totalComplete / total * 100)
  const stars = Object.values(progress.levelStars).reduce((sum, value) => sum + value, 0)
  const kk = progress.language === 'kk'
  const musicLabel = kk ? musicEnabled ? 'Музыканы өшіру' : 'Музыканы қосу' : musicEnabled ? 'Выключить музыку' : 'Включить музыку'

  return <main className="landing-page home-page">
    <div className="space-glow glow-one" /><div className="space-glow glow-two" />
    <nav className="landing-nav home-controls" aria-label={kk ? 'Интерфейс баптаулары' : 'Настройки интерфейса'}><LanguageSwitch /><button className="sound-button" onClick={toggleMusic} title={musicLabel} aria-label={musicLabel}>{musicEnabled ? '🔊' : '🔇'}</button></nav>

    <section className="hero-copy home-hero">
      <div className="mission-tag"><span /> ҒЫЛЫМ • НАУКА • ЗЕРТТЕУ</div>
      <h1>SCIENCE <span>QUEST</span> <em>KZ</em></h1>
      <p className="hero-subtitle">Жаратылыстану әлеміне саяхат <span>• Путешествие в мир естествознания</span></p>
      <p className="hero-intro">{kk ? '23 тақырып • тәжірибелер • квесттер • миссиялар' : '23 темы • эксперименты • квесты • миссии'}</p>
      <div className="hero-actions home-actions">
        <button className="primary-button home-action-primary" onClick={onStart}>▶ {copy.start}</button>
        {progress.completedLevels.length > 0 && <button className="secondary-button home-action-secondary" onClick={onContinue}>↗ {copy.continue}</button>}
        <button className="icon-button home-action-icon" onClick={onAchievements} aria-label={copy.achievements}>🏆 <span>{copy.achievements}</span></button>
        <button className="icon-button home-action-icon" onClick={onProfile} aria-label={copy.profile}>👤 <span>{copy.profile}</span></button>
        <button className="icon-button home-action-icon" onClick={onLeaderboard} aria-label={copy.leaderboard}>📊 <span>{copy.leaderboard}</span></button>
      </div>
    </section>

    <section className="home-dashboard" aria-label={kk ? 'Ойын көрсеткіштері' : 'Игровые показатели'}>
      <article className="home-dashboard-card home-progress-card">
        <header><small>{kk ? 'МЕНІҢ ПРОГРЕСІМ' : 'МОЙ ПРОГРЕСС'}</small><b>{completion}%</b></header>
        <div className="home-progress-identity"><AvatarImage value={profile?.avatarPath ? `${profile.avatarPath}?v=${new Date(profile.updatedAt).getTime()}` : profile?.avatar ?? '🧑‍🚀'} label={profile?.nickname ?? progress.name} /><div><h2>{profile?.nickname ?? progress.name}</h2><p>{getRank(progress.xp, progress.language)}</p></div></div>
        <div className="home-progress-line" aria-label={`${completion}%`}><i style={{ width: `${completion}%` }} /></div>
        <div className="home-progress-metrics"><span><strong>{progress.xp}</strong> XP</span><span><strong>{stars}</strong> ⭐</span><span><strong>{progress.sciencePoints}</strong> 💎</span></div>
      </article>

      <LeaderboardPreview onOpen={onLeaderboard} />

      {assignments.length > 0 && <section className="home-dashboard-card home-assignments" aria-labelledby="student-assignments-title">
        <header><div><small>{kk ? 'МҰҒАЛІМ ТАПСЫРМАСЫ' : 'ЗАДАНИЕ ПРЕПОДАВАТЕЛЯ'}</small><h2 id="student-assignments-title">{kk ? 'Тапсырмалар' : 'Назначения'}</h2></div>{assignments.some((item) => item.status === 'not_started') && <span className="assignment-new">NEW</span>}</header>
        <div className="home-assignment-list">{assignments.slice(0, 3).map((assignment) => <article className={assignment.priority === 'priority' ? 'priority' : ''} key={assignment.assignmentId}>
          <span>{assignment.status === 'completed' ? '✅' : assignment.priority === 'priority' ? '📌' : '🧭'}</span><div><strong>{assignment.title[progress.language]}</strong><p>{assignment.description[progress.language]}</p><div className="assignment-progress"><i style={{ width: `${assignment.progressPercent}%` }} /></div><small>{assignment.completedItems}/{assignment.totalItems}</small></div>
          <button onClick={() => onAssignment(assignment.itemType, assignment.itemId)} aria-label={`${assignment.title[progress.language]}: ${kk ? 'Жалғастыру' : 'Продолжить'}`}>→</button>
        </article>)}</div>
      </section>}
    </section>

    <div className="floating-atoms" aria-hidden="true">{Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>
  </main>
}
