import { useEffect, useState } from 'react'
import { adminCopy } from '../content/admin'
import { fetchAdminDashboard } from '../services/adminService'
import { useGame } from '../store/GameStore'
import type { AdminDashboardStats } from '../types/admin'
import { fetchLearningDashboard } from '../services/learningService'
import type { LearningDashboardStats } from '../types/learning'

export function AdminDashboard() {
  const { progress } = useGame(); const copy = adminCopy(progress.language)
  const [data, setData] = useState<AdminDashboardStats | null>(null); const [error, setError] = useState(false)
  const [learning, setLearning] = useState<LearningDashboardStats | null>(null)
  const load = () => { setError(false); void Promise.all([fetchAdminDashboard(), fetchLearningDashboard()]).then(([dashboard, learningData]) => { setData(dashboard); setLearning(learningData) }).catch(() => setError(true)) }
  useEffect(load, [])
  if (error) return <AdminError onRetry={load} />
  if (!data) return <AdminLoading />
  const cards = [[copy.totalStudents,data.totalStudents,'🧑‍🎓'],[copy.activeToday,data.activeToday,'⚡'],[copy.activeWeek,data.activeWeek,'📅'],[copy.completedLevels,data.completedLevels,'✅'],[copy.averageXp,data.averageXp,'⭐'],[copy.averageAccuracy,`${data.averageAccuracy}%`,'🎯'],[copy.challenges,data.challenges,'🔥']]
  const extra = learning ? [[progress.language === 'kk' ? 'Белсенді тапсырмалар' : 'Активные назначения',learning.activeAssignments,'📌'],[progress.language === 'kk' ? 'Тапсырма орындалды' : 'Назначений выполнено',learning.completedAssignments,'✅'],[progress.language === 'kk' ? 'Орташа тапсырма прогресі' : 'Средний прогресс',`${learning.averageAssignmentProgress}%`,'📈'],[progress.language === 'kk' ? 'Жақында ойында' : 'Недавно в игре',learning.recentPlayers,'🟢']] : []
  return <><header className="admin-page-heading"><small>SCIENCE QUEST KZ</small><h1>{copy.dashboard}</h1></header><section className="admin-stat-grid">{[...cards,...extra].map(([label,value,icon]) => <article key={String(label)}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>)}</section>{learning && <section className="admin-attention"><header><span>⚠️</span><div><small>ACTION REQUIRED</small><h2>{progress.language === 'kk' ? 'Назар аударуды қажет етеді' : 'Требует внимания'}</h2></div></header><div><article><b>{learning.overdueStudents}</b><span>{progress.language === 'kk' ? 'мерзімі өткен тапсырма' : 'просроченных назначений'}</span></article><article><b>{learning.highAttemptStudents}</b><span>{progress.language === 'kk' ? '5-тен көп әрекет жасаған оқушы' : 'учеников с более чем 5 попытками'}</span></article></div></section>}<section className="admin-grade-card"><h2>{copy.grade5} / {copy.grade6}</h2><div><span><b>{data.grade5}</b>{copy.grade5}</span><span><b>{data.grade6}</b>{copy.grade6}</span></div></section></>
}

export function AdminLoading() { return <div className="admin-loading" role="status"><span className="admin-spinner" />Загрузка…</div> }
export function AdminError({ onRetry }: { onRetry: () => void }) { return <div className="admin-error"><span>📡</span><p>Не удалось загрузить данные.</p><button className="secondary-button" onClick={onRetry}>↻</button></div> }
