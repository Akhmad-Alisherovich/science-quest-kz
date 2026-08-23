import { useEffect, useMemo, useState } from 'react'
import { adminCopy } from '../content/admin'
import { levelById } from '../content/levels'
import { fetchAdminStudents } from '../services/adminService'
import { fetchAdminStudentLearningSummaries } from '../services/learningService'
import { useGame } from '../store/GameStore'
import type { AdminStudent } from '../types/admin'
import { AdminError, AdminLoading } from './AdminDashboard'
import { AdminStudentLearningDetail } from './AdminStudentLearningDetail'
import { formatAdminDate } from './adminFormat'
import { AvatarImage } from '../components/AvatarImage'

export function AdminStudents({ onManageContent }: { onManageContent?: (userIds: string[]) => void }) {
  const { progress } = useGame()
  const copy = adminCopy(progress.language)
  const kk = progress.language === 'kk'
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [active, setActive] = useState('all')
  const [sort, setSort] = useState('xp_desc')
  const [performance, setPerformance] = useState('all')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<AdminStudent[]>([])
  const [checked, setChecked] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const filters = useMemo(() => ({ search, grade, active, sort, page }), [search, grade, active, sort, page])

  const load = () => {
    setLoading(true); setError(false)
    void Promise.all([fetchAdminStudents(filters), fetchAdminStudentLearningSummaries()])
      .then(([studentRows, summaries]) => setRows(studentRows.map((row) => ({ ...row, ...summaries.get(row.userId) }))))
      .catch(() => setError(true)).finally(() => setLoading(false))
  }
  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer) }, [filters])

  if (selected) return <AdminStudentLearningDetail userId={selected} onBack={() => setSelected(null)} onManageContent={onManageContent} />
  const total = rows[0]?.totalCount ?? 0
  const visibleRows = rows.filter((row) => performance === 'high' ? row.averageAccuracy >= 90 : performance === 'struggling' ? row.needsAttention : performance === 'assigned' ? (row.pendingAssignments ?? 0) > 0 : true)
  const toggle = (id: string) => setChecked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return <>
    <header className="admin-page-heading"><small>ADMIN · STUDENT MANAGEMENT</small><h1>{copy.students}</h1></header>
    <section className="admin-filters admin-student-filters">
      <input aria-label={copy.search} placeholder={copy.search} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
      <select value={grade ?? ''} onChange={(e) => { setGrade(e.target.value ? Number(e.target.value) : null); setPage(0) }}><option value="">{copy.allGrades}</option><option value="5">{copy.grade5}</option><option value="6">{copy.grade6}</option></select>
      <select value={active} onChange={(e) => { setActive(e.target.value); setPage(0) }}><option value="all">{copy.allActivity}</option><option value="today">{copy.today}</option><option value="week">{copy.week}</option></select>
      <select value={performance} onChange={(e) => setPerformance(e.target.value)}><option value="all">{kk ? 'Барлық нәтиже' : 'Все результаты'}</option><option value="assigned">{kk ? 'Аяқталмаған тапсырма бар' : 'Есть незавершённое назначение'}</option><option value="struggling">{kk ? 'Қайталауды қажет етеді' : 'Нужно повторить'}</option><option value="high">{kk ? 'Жоғары нәтиже' : 'Высокие результаты'}</option></select>
      <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="xp_desc">{copy.sortXp} ↓</option><option value="xp_asc">{copy.sortXp} ↑</option><option value="nickname">{copy.sortName}</option><option value="recent">{copy.sortRecent}</option></select>
    </section>
    {checked.length > 0 && <section className="admin-bulk-bar"><strong>☑ {checked.length}</strong><span>{kk ? 'оқушы таңдалды' : 'учеников выбрано'}</span><button onClick={() => onManageContent?.(checked)}>🧭 {kk ? 'Контентті басқару' : 'Управлять контентом'}</button><button aria-label={kk ? 'Таңдауды тазарту' : 'Снять выбор'} onClick={() => setChecked([])}>×</button></section>}
    {loading ? <AdminLoading /> : error ? <AdminError onRetry={load} /> : visibleRows.length === 0 ? <p className="admin-empty">{copy.noData}</p> : <section className="admin-table">
      <div className="admin-table-head admin-students-head"><label><input type="checkbox" aria-label={kk ? 'Барлығын таңдау' : 'Выбрать всех'} checked={visibleRows.length > 0 && visibleRows.every((row) => checked.includes(row.userId))} onChange={() => setChecked(visibleRows.every((row) => checked.includes(row.userId)) ? [] : visibleRows.map((row) => row.userId))} /></label><span>#</span><span>Nickname</span><span>{copy.school}</span><span>XP</span><span>⭐</span><span>{copy.levels}</span><span>{copy.accuracy}</span><span>{copy.lastActive}</span></div>
      {visibleRows.map((row) => {
        const recent = Boolean(row.lastActive && Date.now() - new Date(row.lastActive).getTime() < 24 * 60 * 60_000)
        const attention = row.needsAttention ?? row.averageAccuracy < 70
        const currentTitle = row.currentLevelId ? levelById[row.currentLevelId]?.title[progress.language] ?? row.currentLevelId : '—'
        return <div key={row.userId} className="admin-student-row admin-student-select-row">
          <label><input type="checkbox" aria-label={`${row.nickname}: ${kk ? 'таңдау' : 'выбрать'}`} checked={checked.includes(row.userId)} onChange={() => toggle(row.userId)} /></label>
          <button className="student-row-main" onClick={() => setSelected(row.userId)}>
            <b>#{row.rank}</b><span className="admin-student-name"><AvatarImage value={row.avatar} label={row.nickname} /><span><strong>{row.nickname}</strong>{row.displayName && row.displayName !== row.nickname && <small>{row.displayName}</small>}<small><em className={attention ? 'status-red' : recent ? 'status-green' : 'status-yellow'} />{row.grade ? `${row.grade} ${kk ? 'сынып' : 'класс'}` : '—'} · 📌 {row.pendingAssignments ?? 0}</small></span></span>
            <span className="student-current"><strong>{row.school || '—'}</strong><small>{currentTitle}</small></span><strong>{row.xp}</strong><span>{row.stars}</span><span>{row.completedLevels}/98</span><span>{row.averageAccuracy}%</span><time>{formatAdminDate(row.lastActive, progress.language)}</time>
          </button>
        </div>
      })}
    </section>}
    <nav className="admin-pagination"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>←</button><span>{page + 1} / {Math.max(1, Math.ceil(total / 50))}</span><button disabled={(page + 1) * 50 >= total} onClick={() => setPage((value) => value + 1)}>→</button></nav>
  </>
}

export const formatDate = formatAdminDate
