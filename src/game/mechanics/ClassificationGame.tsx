import { useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ui } from '../../content/ui'
import { useSound } from '../../hooks/useSound'
import type { Language, TopicContent } from '../../types/game'
import { useCompletion } from '../engines/useCompletion'
import { AnswerFeedback } from './AnswerFeedback'

export function ClassificationGame({ topic, language, onSolved }: { topic: TopicContent; language: Language; onSolved: (mistakes: number) => void }) {
  const [assignments, setAssignments] = useState<Record<number, number>>({})
  const [selected, setSelected] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const [pointerDragging, setPointerDragging] = useState<number | null>(null)
  const pointer = useRef<{ itemIndex: number; x: number; y: number; dragging: boolean } | null>(null)
  const suppressClick = useRef(false)
  const sound = useSound()
  const report = useCompletion(onSolved)
  const copy = ui(language)

  const assign = (itemIndex: number, category: number) => {
    if (solved) return
    setAssignments((state) => ({ ...state, [itemIndex]: category }))
    setSelected(null)
  }
  const drop = (event: DragEvent, category: number) => {
    event.preventDefault()
    const index = Number(event.dataTransfer.getData('text/plain'))
    if (Number.isInteger(index)) assign(index, category)
  }
  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>, itemIndex: number) => {
    if (event.pointerType === 'mouse' || solved) return
    pointer.current = { itemIndex, x: event.clientX, y: event.clientY, dragging: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelected(itemIndex)
  }
  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = pointer.current
    if (!active) return
    if (!active.dragging && Math.hypot(event.clientX - active.x, event.clientY - active.y) > 8) {
      active.dragging = true
      setPointerDragging(active.itemIndex)
    }
    if (active.dragging) event.preventDefault()
  }
  const pointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = pointer.current
    if (!active) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (active.dragging) {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-drop-category]')
      const category = Number(target?.dataset.dropCategory)
      if (Number.isInteger(category)) assign(active.itemIndex, category)
      suppressClick.current = true
    }
    pointer.current = null
    setPointerDragging(null)
  }
  const check = () => {
    const complete = topic.sort.items.every((item, index) => assignments[index] === item.category)
    if (complete) { setSolved(true); sound('correct'); report(mistakes) }
    else { setMistakes((value) => value + 1); sound('wrong') }
  }

  return <div className="mechanic">
    <p className="mechanic-help">☝ {copy.dragHelp}</p>
    <div className="card-tray">
      {topic.sort.items.map((item, index) => assignments[index] === undefined && <button key={item.label.ru} className={`science-card draggable ${selected === index ? 'selected' : ''} ${pointerDragging === index ? 'is-pointer-dragging' : ''}`} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))} onPointerDown={(event) => pointerDown(event, index)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return } setSelected(index) }} aria-pressed={selected === index}>{item.label[language]}</button>)}
    </div>
    <div className="classification-grid">
      {topic.sort.categories.map((category, categoryIndex) => <div key={category.ru} className="drop-zone" data-drop-category={categoryIndex} role="button" tabIndex={0} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, categoryIndex)} onClick={() => selected !== null && assign(selected, categoryIndex)} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && selected !== null) { event.preventDefault(); assign(selected, categoryIndex) } }}>
        <strong>{category[language]}</strong>
        <span className="drop-items">{topic.sort.items.map((item, itemIndex) => assignments[itemIndex] === categoryIndex && <button key={item.label.ru} className="dropped-card" onClick={(event) => { event.stopPropagation(); setAssignments((state) => { const next = { ...state }; delete next[itemIndex]; return next }) }}>{item.label[language]} ×</button>)}</span>
      </div>)}
    </div>
    <button className="primary-button compact" disabled={Object.keys(assignments).length !== topic.sort.items.length || solved} onClick={check}>{copy.check}</button>
    <AnswerFeedback language={language} topic={topic} mistakes={mistakes} solved={solved} />
  </div>
}
