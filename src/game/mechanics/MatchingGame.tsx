import { useMemo, useState } from 'react'
import { ui } from '../../content/ui'
import { useSound } from '../../hooks/useSound'
import type { Language, TopicContent } from '../../types/game'
import { useCompletion } from '../engines/useCompletion'
import { AnswerFeedback } from './AnswerFeedback'

export function MatchingGame({ topic, language, onSolved }: { topic: TopicContent; language: Language; onSolved: (mistakes: number) => void }) {
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const definitions = useMemo(() => topic.terms.map((_, index) => index).reverse(), [topic])
  const sound = useSound()
  const report = useCompletion(onSolved)
  const copy = ui(language)
  const solved = matched.length === topic.terms.length

  const chooseDefinition = (index: number) => {
    if (selectedTerm === null || matched.includes(index)) return
    if (selectedTerm === index) {
      const next = [...matched, index]
      setMatched(next)
      setSelectedTerm(null)
      sound('correct')
      if (next.length === topic.terms.length) report(mistakes)
    } else {
      setMistakes((value) => value + 1)
      setSelectedTerm(null)
      sound('wrong')
    }
  }

  return <div className="mechanic">
    <p className="mechanic-help">↔ {copy.selectPair}</p>
    <div className="matching-grid">
      <div className="matching-column">
        {topic.terms.map((pair, index) => <button key={pair.term.ru} disabled={matched.includes(index)} className={`science-card ${selectedTerm === index ? 'selected' : ''} ${matched.includes(index) ? 'matched' : ''}`} onClick={() => setSelectedTerm(index)}>{pair.term[language]} {matched.includes(index) && '✓'}</button>)}
      </div>
      <div className="matching-column">
        {definitions.map((index) => <button key={index} disabled={matched.includes(index)} className={`science-card ${matched.includes(index) ? 'matched' : ''}`} onClick={() => chooseDefinition(index)}>{topic.terms[index].definition[language]}</button>)}
      </div>
    </div>
    <AnswerFeedback language={language} topic={topic} mistakes={mistakes} solved={solved} />
  </div>
}
