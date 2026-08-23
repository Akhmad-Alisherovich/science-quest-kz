import { useState } from 'react'
import { bulkSetAdminContentAccess } from '../services/learningService'
import type { LearningContentType } from '../types/learning'
import { AdminConfirmDialog } from './AdminConfirmDialog'

type Action = 'open' | 'locked' | 'hidden' | 'assigned'
const actions: Array<[Action, string, string, string]> = [
  ['open', '🔓', 'Ашу', 'Открыть'],
  ['locked', '🔒', 'Құлыптау', 'Закрыть'],
  ['hidden', '◉', 'Жасыру', 'Скрыть'],
  ['assigned', '📌', 'Тағайындау', 'Назначить'],
]

export function AdminInlineAccess({ userId, contentType, contentId, titleKk, titleRu, kk, onChanged }: {
  userId: string
  contentType: LearningContentType
  contentId: string
  titleKk: string
  titleRu: string
  kk: boolean
  onChanged?: () => void
}) {
  const [pending, setPending] = useState<Action | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const apply = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await bulkSetAdminContentAccess({ targetMode: 'users', targetValues: [userId], contentType, contentId, accessState: pending, titleKk, titleRu })
      setMessage(kk ? 'Сақталды' : 'Сохранено')
      setPending(null)
      onChanged?.()
    } catch {
      setMessage(kk ? 'Қате' : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }
  const active = actions.find(([state]) => state === pending)
  return <div className="inline-access-actions">
    <div>{actions.map(([state, icon, labelKk, labelRu]) => <button type="button" key={state} title={kk ? labelKk : labelRu} aria-label={kk ? labelKk : labelRu} onClick={() => setPending(state)}>{icon}<span>{kk ? labelKk : labelRu}</span></button>)}</div>
    {message && <small role="status">{message}</small>}
    {pending && active && <AdminConfirmDialog title={kk ? 'Әрекетті растаңыз' : 'Подтвердите действие'} confirmLabel={kk ? 'Растау' : 'Подтвердить'} cancelLabel={kk ? 'Бас тарту' : 'Отмена'} busy={busy} onConfirm={() => void apply()} onCancel={() => setPending(null)}><p><strong>{active[1]} {kk ? active[2] : active[3]}</strong></p><p>{kk ? titleKk : titleRu}</p><p>{kk ? 'Алушы: осы оқушы' : 'Получатель: этот ученик'}</p></AdminConfirmDialog>}
  </div>
}
