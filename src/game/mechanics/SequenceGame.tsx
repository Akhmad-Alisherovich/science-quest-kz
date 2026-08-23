import { useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ui } from '../../content/ui'
import { useSound } from '../../hooks/useSound'
import type { Language, TopicContent } from '../../types/game'
import { useCompletion } from '../engines/useCompletion'
import { AnswerFeedback } from './AnswerFeedback'

export function SequenceGame({ topic, language, onSolved }: { topic: TopicContent; language: Language; onSolved: (mistakes: number) => void }) {
  const [order, setOrder] = useState(() => topic.sequence.map((_, index) => index).reverse())
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const [pointerTarget, setPointerTarget] = useState<number | null>(null)
  const pointer = useRef<{ source: number; x: number; y: number; dragging: boolean } | null>(null)
  const pointerTargetRef = useRef<number | null>(null)
  const sound = useSound()
  const report = useCompletion(onSolved)
  const copy = ui(language)
  const move = (position: number, direction: -1 | 1) => {
    const target = position + direction
    if (target < 0 || target >= order.length || solved) return
    setOrder((state) => { const next = [...state]; [next[position], next[target]] = [next[target], next[position]]; return next })
  }
  const drop = (event: DragEvent, target: number) => {
    event.preventDefault()
    const source = Number(event.dataTransfer.getData('text/plain'))
    if (!Number.isInteger(source) || source === target) return
    setOrder((state) => { const next = [...state]; const [item] = next.splice(source, 1); next.splice(target, 0, item); return next })
  }
  const reorder = (source: number, target: number) => {
    if (source === target || solved) return
    setOrder((state) => { const next = [...state]; const [item] = next.splice(source, 1); next.splice(target, 0, item); return next })
  }
  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>, source: number) => {
    if (event.pointerType === 'mouse' || solved) return
    pointer.current = { source, x: event.clientX, y: event.clientY, dragging: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = pointer.current
    if (!active) return
    if (!active.dragging && Math.hypot(event.clientX - active.x, event.clientY - active.y) > 8) active.dragging = true
    if (!active.dragging) return
    event.preventDefault()
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-sequence-position]')
    const target = Number(row?.dataset.sequencePosition)
    pointerTargetRef.current = Number.isInteger(target) ? target : null
    setPointerTarget(pointerTargetRef.current)
  }
  const pointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = pointer.current
    if (!active) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (active.dragging && pointerTargetRef.current !== null) reorder(active.source, pointerTargetRef.current)
    pointer.current = null
    pointerTargetRef.current = null
    setPointerTarget(null)
  }
  const check = () => {
    const correct = order.every((value, index) => value === index)
    if (correct) { setSolved(true); sound('correct'); report(mistakes) }
    else { setMistakes((value) => value + 1); sound('wrong') }
  }
  return <div className="mechanic">
    <p className="mechanic-help">↕ {copy.sequenceHelp}</p>
    <div className="sequence-list">
      {order.map((itemIndex, position) => <div key={itemIndex} className={`sequence-item ${pointerTarget === position ? 'pointer-target' : ''}`} data-sequence-position={position} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', String(position))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, position)}>
        <span className="sequence-number">{position + 1}</span><span>{topic.sequence[itemIndex][language]}</span>
        <span className="sequence-controls"><button aria-label={copy.moveUp} onClick={() => move(position, -1)}>↑</button><button aria-label={copy.moveDown} onClick={() => move(position, 1)}>↓</button></span>
        <button className="sequence-drag-handle" draggable={false} aria-label={copy.dragItem} onPointerDown={(event) => pointerDown(event, position)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>⠿</button>
      </div>)}
    </div>
    <button className="primary-button compact" disabled={solved} onClick={check}>{copy.check}</button>
    <AnswerFeedback language={language} topic={topic} mistakes={mistakes} solved={solved} />
  </div>
}
