import type { Language, TopicContent } from '../../types/game'
import { ui } from '../../content/ui'

export function AnswerFeedback({ language, topic, mistakes, solved }: { language: Language; topic: TopicContent; mistakes: number; solved: boolean }) {
  const copy = ui(language)
  if (solved) return (
    <div className="feedback feedback--correct" role="status">
      <strong>{copy.correct}</strong>
      <details open>
        <summary>💡 {copy.why}</summary>
        <p>{topic.explanation[language]}</p>
      </details>
    </div>
  )
  if (mistakes === 0) return null
  const hintIndex = Math.min(mistakes, 3) - 1
  return (
    <div className="feedback feedback--hint" role="status">
      <strong>{copy.wrong}</strong>
      <p>💡 {copy.hint} {hintIndex + 1}/3: {topic.hints[hintIndex][language]}</p>
    </div>
  )
}
