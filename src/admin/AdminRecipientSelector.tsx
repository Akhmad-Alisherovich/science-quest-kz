import { useEffect, useMemo, useState } from 'react'
import { AvatarImage } from '../components/AvatarImage'
import { countAdminContentRecipients, fetchAdminContentRecipients } from '../services/learningService'
import type { AdminContentRecipient, AdminRecipientMode, LearningContentType } from '../types/learning'

type Selection = { mode: AdminRecipientMode; values: string[]; count: number }

const stateLabels = {
  open: { kk: 'Ашық', ru: 'Открыто' },
  locked: { kk: 'Құлыптаулы', ru: 'Закрыто' },
  hidden: { kk: 'Жасырын', ru: 'Скрыто' },
  assigned: { kk: 'Тағайындалған', ru: 'Назначено' },
  completed: { kk: 'Аяқталған', ru: 'Завершено' },
} as const

export function AdminRecipientSelector({
  contentType,
  contentId,
  kk,
  initial,
  onClose,
  onApply,
}: {
  contentType: LearningContentType
  contentId: string
  kk: boolean
  initial: Selection
  onClose: () => void
  onApply: (selection: Selection) => void
}) {
  const [mode, setMode] = useState<AdminRecipientMode>(initial.mode)
  const [values, setValues] = useState<string[]>(initial.values)
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [active, setActive] = useState<'all' | 'today' | 'week'>('all')
  const [students, setStudents] = useState<AdminContentRecipient[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  useEffect(() => {
    if (mode !== 'users') return
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      void fetchAdminContentRecipients({ contentType, contentId, search, grade, active })
        .then(setStudents)
        .catch(() => setError(kk ? 'Оқушылар тізімі жүктелмеді.' : 'Не удалось загрузить учеников.'))
        .finally(() => setLoading(false))
    }, 220)
    return () => window.clearTimeout(timer)
  }, [active, contentId, contentType, grade, kk, mode, search])

  const visibleIds = useMemo(() => students.map((student) => student.userId), [students])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => values.includes(id))
  const toggle = (value: string) => setValues((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  const changeMode = (next: AdminRecipientMode) => { setMode(next); setValues([]); setError('') }
  const selectVisible = () => setValues((current) => Array.from(new Set([...current, ...visibleIds])))
  const deselectVisible = () => setValues((current) => current.filter((id) => !visibleIds.includes(id)))
  const submit = async () => {
    if (mode !== 'all' && values.length === 0) {
      setError(kk ? 'Кемінде бір алушыны таңдаңыз.' : 'Выберите хотя бы одного получателя.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const count = await countAdminContentRecipients(mode, values)
      if (!count) throw new Error('NO_RECIPIENTS')
      onApply({ mode, values, count })
    } catch {
      setError(kk ? 'Белсенді оқушылар табылмады.' : 'Активные ученики не найдены.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="admin-modal-backdrop recipient-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="admin-recipient-modal" role="dialog" aria-modal="true" aria-labelledby="recipient-title">
      <header>
        <div><small>RECIPIENTS</small><h2 id="recipient-title">{kk ? 'Алушыларды таңдау' : 'Выбор получателей'}</h2></div>
        <button className="recipient-close" type="button" aria-label={kk ? 'Жабу' : 'Закрыть'} onClick={onClose}>×</button>
      </header>

      <div className="recipient-modes" role="tablist" aria-label={kk ? 'Алушы түрі' : 'Тип получателей'}>
        <button className={mode === 'all' ? 'active' : ''} type="button" onClick={() => changeMode('all')}>🌐 {kk ? 'Барлық оқушы' : 'Все ученики'}</button>
        <button className={mode === 'grades' ? 'active' : ''} type="button" onClick={() => changeMode('grades')}>🏫 {kk ? 'Сыныптар' : 'Классы'}</button>
        <button className={mode === 'users' ? 'active' : ''} type="button" onClick={() => changeMode('users')}>👥 {kk ? 'Нақты оқушылар' : 'Ученики'}</button>
      </div>

      <div className={mode === 'users' ? 'recipient-body users' : 'recipient-body'}>
        {mode === 'all' && <div className="recipient-all-note"><span>🌐</span><div><strong>{kk ? 'Барлық белсенді student аккаунттары' : 'Все активные student-аккаунты'}</strong><p>{kk ? 'Әрекет серверде нақты оқушылар тізіміне қолданылады.' : 'Сервер применит действие к точному списку учеников.'}</p></div></div>}

        {mode === 'grades' && <div className="recipient-grades">
          <p>{kk ? 'Бір немесе бірнеше сыныпты таңдаңыз' : 'Выберите один или несколько классов'}</p>
          <div>{Array.from({ length: 12 }, (_, index) => String(index + 1)).map((item) => <label key={item} className={values.includes(item) ? 'selected' : ''}><input type="checkbox" checked={values.includes(item)} onChange={() => toggle(item)} /><span>{item}</span>{kk ? 'сынып' : 'класс'}</label>)}</div>
        </div>}

        {mode === 'users' && <>
          <div className="recipient-filters">
            <label className="recipient-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={kk ? 'Никнейм, аты, мектеп немесе сынып' : 'Никнейм, имя, школа или класс'} /></label>
            <select aria-label={kk ? 'Сынып' : 'Класс'} value={grade ?? ''} onChange={(event) => setGrade(event.target.value ? Number(event.target.value) : null)}><option value="">{kk ? 'Барлық сынып' : 'Все классы'}</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select>
            <select aria-label={kk ? 'Белсенділік' : 'Активность'} value={active} onChange={(event) => setActive(event.target.value as typeof active)}><option value="all">{kk ? 'Кез келген белсенділік' : 'Любая активность'}</option><option value="today">{kk ? 'Бүгін белсенді' : 'Активен сегодня'}</option><option value="week">{kk ? '7 күнде белсенді' : 'Активен за 7 дней'}</option></select>
          </div>
          <div className="recipient-list-toolbar"><span>{students[0]?.totalCount ?? 0} {kk ? 'табылды' : 'найдено'}</span><div><button type="button" onClick={allVisibleSelected ? deselectVisible : selectVisible}>{allVisibleSelected ? (kk ? 'Көрінгенін алып тастау' : 'Снять видимых') : (kk ? 'Көрінгеннің бәрін таңдау' : 'Выбрать видимых')}</button><button type="button" onClick={() => setValues([])}>{kk ? 'Тазарту' : 'Очистить'}</button></div></div>
          <div className="recipient-student-list" aria-busy={loading}>
            {loading && <p className="recipient-list-state">{kk ? 'Жүктелуде…' : 'Загрузка…'}</p>}
            {!loading && students.map((student) => <label key={student.userId} className={values.includes(student.userId) ? 'selected' : ''}>
              <input type="checkbox" checked={values.includes(student.userId)} onChange={() => toggle(student.userId)} />
              <AvatarImage value={student.avatar} label={student.nickname} />
              <span><strong>{student.nickname}</strong><small>{student.displayName}{student.school ? ` · ${student.school}` : ''}</small></span>
              <span className="recipient-student-meta"><b>{student.grade ? `${student.grade} ${kk ? 'сынып' : 'класс'}` : '—'}</b><small>{student.xp} XP</small></span>
              <em className={`access-state ${student.accessState}`}>{stateLabels[student.accessState][kk ? 'kk' : 'ru']}</em>
            </label>)}
            {!loading && !students.length && <p className="recipient-list-state">{kk ? 'Сүзгіге сай оқушы жоқ.' : 'Нет учеников по фильтру.'}</p>}
          </div>
        </>}
        {error && <p className="recipient-error" role="alert">{error}</p>}
      </div>

      <footer><span><b>{mode === 'all' ? '∞' : values.length}</b> {kk ? 'таңдалды' : 'выбрано'}</span><div><button type="button" className="secondary" onClick={onClose}>{kk ? 'Болдырмау' : 'Отмена'}</button><button type="button" className="primary" disabled={saving} onClick={() => void submit()}>{saving ? '…' : (kk ? 'Таңдауды қолдану' : 'Применить выбор')}</button></div></footer>
    </section>
  </div>
}
