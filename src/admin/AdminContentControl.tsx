import { useEffect, useMemo, useState } from 'react'
import { topicLevels } from '../content/levels'
import { sections } from '../content/sections'
import { topics } from '../content/topics'
import { bulkSetAdminContentAccess, fetchAdminContentOverview } from '../services/learningService'
import { useGame } from '../store/GameStore'
import type { AdminContentOverview, AdminRecipientMode, LearningContentType } from '../types/learning'
import { AdminConfirmDialog } from './AdminConfirmDialog'
import { AdminError, AdminLoading } from './AdminDashboard'
import { AdminRecipientSelector } from './AdminRecipientSelector'

type AccessAction = 'open' | 'locked' | 'hidden' | 'assigned'
type SelectedContent = { type: LearningContentType; id: string; title: string; titleKk: string; titleRu: string }
type RecipientSelection = { mode: AdminRecipientMode; values: string[]; count: number }
type PendingAction = { state: AccessAction; count: number }

const actionCopy = {
  open: { icon: '🔓', kk: 'Ашу', ru: 'Открыть' },
  locked: { icon: '🔒', kk: 'Құлыптау', ru: 'Закрыть' },
  hidden: { icon: '◉', kk: 'Жасыру', ru: 'Скрыть' },
  assigned: { icon: '📌', kk: 'Тағайындау', ru: 'Назначить' },
} as const

export function AdminContentControl({ initialUsers = [] }: { initialUsers?: string[] }) {
  const { progress } = useGame()
  const kk = progress.language === 'kk'
  const [overview, setOverview] = useState<AdminContentOverview[]>([])
  const [selected, setSelected] = useState<SelectedContent | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [recipients, setRecipients] = useState<RecipientSelection>({ mode: initialUsers.length ? 'users' : 'grades', values: initialUsers, count: initialUsers.length })
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = () => {
    setLoading(true)
    setError(false)
    void fetchAdminContentOverview().then(setOverview).catch(() => setError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const metrics = useMemo(() => selected ? overview.find((item) => item.contentType === selected.type && item.contentId === selected.id) : null, [overview, selected])
  const choose = (type: LearningContentType, id: string, titleKk: string, titleRu: string) => {
    setSelected({ type, id, title: kk ? titleKk : titleRu, titleKk, titleRu })
    setMessage('')
  }
  const ask = (state: AccessAction) => {
    if (!selected) return
    if (!recipients.count) {
      setMessage(kk ? 'Алдымен алушыларды таңдаңыз.' : 'Сначала выберите получателей.')
      setSelectorOpen(true)
      return
    }
    setPending({ state, count: recipients.count })
  }
  const apply = async () => {
    if (!selected || !pending) return
    setBusy(true)
    try {
      const result = await bulkSetAdminContentAccess({ targetMode: recipients.mode, targetValues: recipients.values, contentType: selected.type, contentId: selected.id, accessState: pending.state, titleKk: selected.titleKk, titleRu: selected.titleRu })
      setMessage(kk ? `${result.affectedStudents} оқушы үшін қолжетімділік жаңартылды.` : `Доступ обновлён для ${result.affectedStudents} учеников.`)
      setPending(null)
      load()
    } catch {
      setMessage(kk ? 'Өзгерістер сақталмады.' : 'Не удалось сохранить изменения.')
    } finally {
      setBusy(false)
    }
  }
  const recipientSummary = recipients.mode === 'all'
    ? (kk ? 'Барлық оқушылар' : 'Все ученики')
    : recipients.mode === 'grades'
      ? `${recipients.values.join(', ')} ${kk ? 'сынып' : 'класс'}`
      : `${recipients.count} ${kk ? 'оқушы' : 'учеников'}`

  if (loading && !overview.length) return <AdminLoading />
  if (error && !overview.length) return <AdminError onRetry={load} />

  return <>
    <header className="admin-page-heading"><small>CONTENT CONTROL</small><h1>{kk ? 'Тақырыптар мен квесттер' : 'Темы и квесты'}</h1><p>{kk ? 'Оқу маршрутын нақты оқушыға, бірнеше сыныпқа немесе барлық оқушыға басқарыңыз.' : 'Управляйте учебным маршрутом ученика, нескольких классов или всей школы.'}</p></header>
    {message && <p className="admin-notice" role="status">{message}</p>}
    <div className="admin-content-manager" aria-label={kk ? 'Оқушылар үшін контентті басқару' : 'Управление контентом учеников'}>
      <section className="admin-content-tree" aria-label={kk ? 'Оқу контенті' : 'Учебный контент'}>
        {sections.map((section) => {
          const open = expanded.includes(section.id)
          return <article key={section.id}>
            <button className="content-section" type="button" aria-expanded={open} onClick={() => setExpanded((current) => open ? current.filter((id) => id !== section.id) : [...current, section.id])}><span>{section.icon}</span><strong>{section.title[progress.language]}</strong><b>{open ? '−' : '+'}</b></button>
            {open && <div className="content-topics">
              <button className={`content-item section-item ${selected?.type === 'section' && selected.id === section.id ? 'selected' : ''}`} type="button" onClick={() => choose('section', section.id, section.title.kk, section.title.ru)}>{kk ? 'Бүкіл бөлім' : 'Весь раздел'}</button>
              {topics.filter((topic) => topic.sectionId === section.id).map((topic) => <div key={topic.id} className="content-topic">
                <button className={`content-item topic-item ${selected?.type === 'topic' && selected.id === topic.id ? 'selected' : ''}`} type="button" onClick={() => choose('topic', topic.id, topic.title.kk, topic.title.ru)}><span>{topic.icon}</span><strong>{topic.title[progress.language]}</strong></button>
                <div className="content-levels">{topicLevels(topic.id).map((level) => <button className={selected?.type === 'level' && selected.id === level.id ? 'selected' : ''} type="button" key={level.id} onClick={() => choose('level', level.id, level.title.kk, level.title.ru)}><span>{level.difficulty === 4 ? '🔥' : level.difficulty === 3 ? '🧪' : `L${level.difficulty}`}</span>{level.title[progress.language]}</button>)}</div>
              </div>)}
              <button className={`content-item boss-item ${selected?.type === 'boss' && selected.id === `boss:${section.id}` ? 'selected' : ''}`} type="button" onClick={() => choose('boss', `boss:${section.id}`, section.bossTitle.kk, section.bossTitle.ru)}>🔥 Boss Mission · {section.bossTitle[progress.language]}</button>
            </div>}
          </article>
        })}
      </section>

      <aside className="admin-access-panel" aria-label={kk ? 'Қолжетімділік' : 'Доступ'}>
        {!selected ? <div className="admin-empty-state"><span>🧭</span><h2>{kk ? 'Элементті таңдаңыз' : 'Выберите элемент'}</h2><p>{kk ? 'Бөлім, тақырып немесе квест статистикасы осында көрінеді.' : 'Здесь появятся статистика и управление доступом.'}</p></div> : <>
          <small>{selected.type.toUpperCase()}</small><h2>{selected.title}</h2><code>{selected.id}</code>
          <div className="content-metrics"><span><b>{metrics?.completedStudents ?? 0}</b>{kk ? 'Аяқтады' : 'Завершили'}</span><span><b>{metrics?.averageScore ?? 0}%</b>{kk ? 'Орташа нәтиже' : 'Средний балл'}</span><span><b>{metrics?.errorRate ?? 0}%</b>{kk ? 'Қате үлесі' : 'Ошибки'}</span><span><b>{metrics?.averageAttempts ?? 0}</b>{kk ? 'Орташа әрекет' : 'Попытки'}</span><span><b>{metrics?.assignedStudents ?? 0}</b>{kk ? 'Тағайындалды' : 'Назначено'}</span><span><b>{metrics?.accessOverrides ?? 0}</b>{kk ? 'Ереже' : 'Правил'}</span></div>
          <div className="recipient-summary-card"><div><small>{kk ? 'АЛУШЫЛАР' : 'ПОЛУЧАТЕЛИ'}</small><strong>{recipientSummary}</strong><span>{recipients.count ? `${recipients.count} ${kk ? 'белсенді оқушы' : 'активных учеников'}` : (kk ? 'Таңдалмаған' : 'Не выбраны')}</span></div><button type="button" onClick={() => setSelectorOpen(true)}>{kk ? 'Таңдау' : 'Выбрать'}</button></div>
          <div className="access-actions">{(Object.keys(actionCopy) as AccessAction[]).map((state) => <button key={state} type="button" className={state === 'locked' ? 'lock' : state === 'assigned' ? 'assign' : state} onClick={() => ask(state)}>{actionCopy[state].icon} {actionCopy[state][kk ? 'kk' : 'ru']}</button>)}</div>
          <p className="admin-safe-note">🛡 {kk ? 'Әрекет прогресті, XP, жетістіктерді немесе тарихты жоймайды.' : 'Действие не удаляет прогресс, XP, достижения или историю.'}</p>
        </>}
      </aside>
    </div>

    {selectorOpen && selected && <AdminRecipientSelector contentType={selected.type} contentId={selected.id} kk={kk} initial={recipients} onClose={() => setSelectorOpen(false)} onApply={(selection) => { setRecipients(selection); setSelectorOpen(false); setMessage('') }} />}
    {pending && selected && <AdminConfirmDialog title={kk ? 'Жаппай әрекетті растаңыз' : 'Подтвердите массовое действие'} confirmLabel={kk ? 'Растау' : 'Подтвердить'} cancelLabel={kk ? 'Бас тарту' : 'Отмена'} busy={busy} onConfirm={() => void apply()} onCancel={() => setPending(null)}><p><strong>{actionCopy[pending.state].icon} {actionCopy[pending.state][kk ? 'kk' : 'ru']}: {selected.title}</strong></p><p>{pending.count} {kk ? 'алушы' : 'получателей'} · {recipientSummary}</p>{pending.state === 'assigned' && <p>{kk ? 'Қолданыстағы assignment жүйесінде жаңа тапсырма жасалады.' : 'Будет создано задание в существующей системе assignments.'}</p>}</AdminConfirmDialog>}
  </>
}
