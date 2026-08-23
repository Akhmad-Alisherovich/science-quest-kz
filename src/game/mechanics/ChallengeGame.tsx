import { useState } from 'react'
import { ui } from '../../content/ui'
import { useSound } from '../../hooks/useSound'
import type { Language, TopicContent } from '../../types/game'
import { useCompletion } from '../engines/useCompletion'
import { AnswerFeedback } from './AnswerFeedback'

export function ChallengeGame({ topic, language, onSolved }: { topic: TopicContent; language: Language; onSolved: (mistakes: number) => void }) {
  const [answer, setAnswer] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const sound = useSound()
  const report = useCompletion(onSolved)
  const copy = ui(language)
  const check = () => {
    if (answer === topic.challenge.correct) { setSolved(true); sound('correct'); report(mistakes) }
    else { setMistakes((value) => value + 1); setAnswer(null); sound('wrong') }
  }
  return <div className="mechanic challenge-panel">
    <div className="challenge-flame">🔥</div>
    <p className="challenge-scenario">{topic.challenge.scenario[language]}</p>
    <div className="choice-list">{topic.challenge.options.map((option, index) => <button key={option.ru} className={answer === index ? 'selected' : ''} onClick={() => setAnswer(index)}>{String.fromCharCode(65 + index)}. {option[language]}</button>)}</div>
    <button className="primary-button compact" disabled={answer === null || solved} onClick={check}>{copy.check}</button>
    <AnswerFeedback language={language} topic={topic} mistakes={mistakes} solved={solved} />
  </div>
}
