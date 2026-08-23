import { useState } from 'react'
import { ui } from '../../content/ui'
import { useSound } from '../../hooks/useSound'
import type { Language, TopicContent } from '../../types/game'
import { useCompletion } from '../engines/useCompletion'
import { AnswerFeedback } from './AnswerFeedback'

export function LabGame({ topic, language, onSolved }: { topic: TopicContent; language: Language; onSolved: (mistakes: number) => void }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const sound = useSound()
  const report = useCompletion(onSolved)
  const copy = ui(language)
  const lab = topic.lab
  const max = Math.max(...lab.results)
  const check = () => {
    if (answer === lab.correct) { setSolved(true); sound('correct'); report(mistakes) }
    else { setMistakes((value) => value + 1); setAnswer(null); sound('wrong') }
  }
  return <div className="mechanic">
    <p className="mechanic-help">🧪 {copy.labHelp}</p>
    <div className={`lab-stage lab-stage--${lab.mode}`}>
      <div className="lab-visual" aria-label={lab.resultLabel[language]}>
        <div className="lab-orbit">{Array.from({ length: 10 }).map((_, particle) => <span key={particle} className="particle" style={{ '--speed': `${1.8 - index * .25}s`, '--i': particle, left: `${9 + particle * 8}%`, top: `${12 + (particle * 17) % 75}%` } as React.CSSProperties} />)}</div>
        <div className="result-gauge"><span style={{ height: `${(lab.results[index] / max) * 100}%` }} /></div>
      </div>
      <div className="lab-controls">
        <label>{lab.variable[language]}: <strong>{lab.values[index]} {lab.unit}</strong></label>
        <input type="range" min="0" max={lab.values.length - 1} step="1" value={index} onChange={(event) => setIndex(Number(event.target.value))} />
        <div className="live-result"><small>{lab.resultLabel[language]}</small><strong>{lab.results[index]} {lab.resultUnit}</strong></div>
      </div>
      <div className="lab-data-panel">
        <div className="mini-chart" aria-label={lab.resultLabel[language]}>{lab.results.map((result, resultIndex) => <button key={resultIndex} className={resultIndex === index ? 'active' : ''} onClick={() => setIndex(resultIndex)} aria-label={`${lab.values[resultIndex]} ${lab.unit}: ${result} ${lab.resultUnit}`}><span style={{ height: `${Math.max(8, result / max * 100)}%` }} /><small>{lab.values[resultIndex]}</small></button>)}</div>
      </div>
    </div>
    <div className="observation"><strong>{copy.observation}:</strong> {lab.observation[language]}</div>
    <fieldset className="choice-list"><legend>{lab.prompt[language]}</legend>{lab.options.map((option, optionIndex) => <label key={option.ru} className={answer === optionIndex ? 'selected' : ''}><input type="radio" name="lab-answer" checked={answer === optionIndex} onChange={() => setAnswer(optionIndex)} />{option[language]}</label>)}</fieldset>
    <button className="primary-button compact" disabled={answer === null || solved} onClick={check}>{copy.check}</button>
    <AnswerFeedback language={language} topic={topic} mistakes={mistakes} solved={solved} />
  </div>
}
