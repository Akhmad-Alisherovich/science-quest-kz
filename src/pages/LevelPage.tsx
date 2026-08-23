import { useState } from 'react'
import { levelById, topicLevels } from '../content/levels'
import { topicById } from '../content/topics'
import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'
import { MatchingGame } from '../game/mechanics/MatchingGame'
import { ClassificationGame } from '../game/mechanics/ClassificationGame'
import { SequenceGame } from '../game/mechanics/SequenceGame'
import { LabGame } from '../game/mechanics/LabGame'
import { ChallengeGame } from '../game/mechanics/ChallengeGame'

const stageNames = ['know', 'understand', 'apply', 'challenge'] as const

export function LevelPage({ levelId, onBack, onFinish, adminMode = false }: { levelId: string; onBack: () => void; onFinish: () => void; adminMode?: boolean }) {
  const { progress, completeLevel } = useGame()
  const [result, setResult] = useState<{ mistakes: number; stars: number } | null>(null)
  const level = levelById[levelId]; const topic = level ? topicById[level.topicId] : undefined
  if (!level || !topic) return <main className="page-container"><button onClick={onBack}>←</button>Level not found</main>
  const copy = ui(progress.language)
  const previousStars = progress.levelStars[level.id] ?? 0
  const baseAward = progress.completedLevels.includes(level.id) ? 0 : level.xp
  const resultAward = adminMode ? 0 : result ? baseAward + (result.stars === 3 && previousStars < 3 ? 20 : 0) : baseAward
  const onSolved = (mistakes: number) => setResult({ mistakes, stars: mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1 })
  const finish = () => { if (!result) return; if (!adminMode) completeLevel(level.id, result.stars, result.mistakes); onFinish() }
  const mechanicProps = { topic, language: progress.language, onSolved }
  return <main className="level-page">
    <div className="level-topbar"><button className="back-link" onClick={onBack}>← {copy.map}</button><div className="level-steps">{topicLevels(topic.id).map((item) => <span key={item.id} className={item.id === level.id ? 'active' : progress.completedLevels.includes(item.id) ? 'done' : ''} />)}</div><span className="xp-chip">{adminMode ? 'ADMIN · READ ONLY' : `+${level.xp} XP`}</span></div>
    <section className="level-hero"><div className="level-topic-icon">{topic.icon}</div><div><small>{copy.level} {level.difficulty}/4 • {copy[stageNames[level.difficulty - 1]]}</small><h1>{topic.title[progress.language]}</h1><p>{level.title[progress.language]}</p></div></section>
    <div className="level-layout"><aside className="theory-card"><span>📓 {copy.theory}</span><p>{topic.theory[progress.language]}</p><div className="formula-mark">∴</div></aside>
      <section className="game-card"><div className="instruction-label">{copy.instruction}</div><h2>{level.instruction[progress.language]}</h2>
        {level.type === 'matching' && <MatchingGame {...mechanicProps} />}
        {level.type === 'classification' && <ClassificationGame {...mechanicProps} />}
        {level.type === 'sequence' && <SequenceGame {...mechanicProps} />}
        {(level.type === 'experiment' || level.type === 'data' || level.type === 'model') && <LabGame {...mechanicProps} />}
        {level.type === 'challenge' && <ChallengeGame {...mechanicProps} />}
        {result && <div className="result-strip"><div className="earned-stars">{[1, 2, 3].map((star) => <span key={star} className={star <= result.stars ? 'earned' : ''}>★</span>)}</div><div><strong>{adminMode ? (progress.language === 'kk' ? 'Тексеру аяқталды' : 'Проверка завершена') : `+${resultAward} XP`}</strong><small>{adminMode ? (progress.language === 'kk' ? 'XP, прогресс және жетістіктер өзгермейді.' : 'XP, прогресс и достижения не изменяются.') : resultAward === 0 ? copy.repeatNoXp : result.stars === 3 && previousStars < 3 ? copy.perfectBonus : result.mistakes === 0 ? (progress.language === 'kk' ? 'Мінсіз зерттеу!' : 'Идеальное исследование!') : `${result.mistakes} ${progress.language === 'kk' ? 'қате' : 'ошибок'}`}</small></div><button className="primary-button compact" onClick={finish}>{copy.finish} →</button></div>}
      </section>
    </div>
  </main>
}
