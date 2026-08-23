import { useMemo, useState } from 'react'
import { sections } from '../content/sections'
import { topics } from '../content/topics'
import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'
import { MatchingGame } from './mechanics/MatchingGame'
import { ClassificationGame } from './mechanics/ClassificationGame'
import { SequenceGame } from './mechanics/SequenceGame'
import { LabGame } from './mechanics/LabGame'
import { ChallengeGame } from './mechanics/ChallengeGame'

export function BossMission({ sectionId, onBack, onComplete, adminMode = false }: { sectionId: string; onBack: () => void; onComplete: () => void; adminMode?: boolean }) {
  const { progress, isBossUnlocked, completeBoss } = useGame()
  const [stage, setStage] = useState(0); const [stageSolved, setStageSolved] = useState(false); const [totalMistakes, setTotalMistakes] = useState(0)
  const section = sections.find((item) => item.id === sectionId)!
  const zoneTopics = useMemo(() => topics.filter((topic) => topic.sectionId === sectionId), [sectionId])
  const copy = ui(progress.language)
  if (!adminMode && !isBossUnlocked(sectionId) && !progress.completedBosses.includes(sectionId)) return <main className="page-container narrow"><button className="back-link" onClick={onBack}>← {copy.back}</button><div className="locked-mission">🔒<h1>{section.bossTitle[progress.language]}</h1><p>{copy.bossLocked}</p></div></main>
  const topic = zoneTopics[stage % zoneTopics.length]
  const solved = (mistakes: number) => { setStageSolved(true); setTotalMistakes((value) => value + mistakes) }
  const next = () => { if (stage < 4) { setStage((value) => value + 1); setStageSolved(false) } else { if (!adminMode) completeBoss(sectionId, totalMistakes); onComplete() } }
  const props = { key: `${stage}-${topic.id}`, topic, language: progress.language, onSolved: solved }
  return <main className="boss-page" style={{ '--zone-color': section.color } as React.CSSProperties}>
    <div className="boss-header"><button className="back-link" onClick={onBack}>← {copy.map}</button><span>🔥 {copy.boss}</span><strong>{adminMode ? 'ADMIN · READ ONLY' : `${copy.bossStage} ${stage + 1}/5`}</strong></div>
    <div className="mission-progress">{Array.from({ length: 5 }).map((_, index) => <span key={index} className={index < stage ? 'done' : index === stage ? 'active' : ''} />)}</div>
    <section className="boss-brief"><span>{section.icon}</span><div><small>{section.title[progress.language]}</small><h1>{section.bossTitle[progress.language]}</h1><p>{progress.language === 'kk' ? 'Ғылыми мәселені бес дәлел арқылы шеш: ұғым, жіктеу, үдеріс, эксперимент және қорытынды.' : 'Реши научную проблему через пять доказательств: понятия, классификацию, процесс, эксперимент и вывод.'}</p></div></section>
    <section className="boss-game game-card"><h2>{topic.title[progress.language]}</h2>
      {stage === 0 && <MatchingGame {...props} />}{stage === 1 && <ClassificationGame {...props} />}{stage === 2 && <SequenceGame {...props} />}{stage === 3 && <LabGame {...props} />}{stage === 4 && <ChallengeGame {...props} />}
      {stageSolved && <div className="boss-next"><span>{stage === 4 ? '🏆' : '✅'}</span><div><strong>{stage === 4 ? copy.missionComplete : copy.correct}</strong><small>{totalMistakes} {progress.language === 'kk' ? 'жалпы қате' : 'ошибок в миссии'}</small></div><button className="primary-button compact" onClick={next}>{stage === 4 ? copy.finish : copy.next} →</button></div>}
    </section>
  </main>
}
