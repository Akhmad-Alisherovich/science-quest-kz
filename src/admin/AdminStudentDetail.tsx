import { useEffect, useState } from 'react'
import { adminCopy } from '../content/admin'
import { levelById } from '../content/levels'
import { sections } from '../content/sections'
import { fetchAdminStudentContact, fetchAdminStudentDetail, fetchAdminStudentHistory, fetchAdminStudentProgress } from '../services/adminService'
import { formatPhone } from '../services/privateContactService'
import { useGame } from '../store/GameStore'
import type { AdminLevelHistory, AdminSectionProgress, AdminStudentDetail } from '../types/admin'
import { AdminError, AdminLoading } from './AdminDashboard'
import { formatAdminDate as formatDate } from './adminFormat'
import { AvatarImage } from '../components/AvatarImage'

export function AdminStudentDetailView({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { progress: game } = useGame(); const copy = adminCopy(game.language)
  const [detail, setDetail] = useState<AdminStudentDetail | null>(null); const [progress, setProgress] = useState<AdminSectionProgress[]>([]); const [history, setHistory] = useState<AdminLevelHistory[]>([]); const [error, setError] = useState(false); const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState<string | null>(null)
  const load = () => { setLoading(true); setError(false); void Promise.all([fetchAdminStudentDetail(userId),fetchAdminStudentProgress(userId),fetchAdminStudentHistory(userId),fetchAdminStudentContact(userId)]).then(([d,p,h,c]) => { setDetail(d); setProgress(p); setHistory(h); setPhone(c) }).catch(() => setError(true)).finally(() => setLoading(false)) }
  useEffect(load, [userId])
  if (loading) return <AdminLoading />; if (error || !detail) return <AdminError onRetry={load} />
  const weak = history.filter((row) => row.accuracy < 70).slice(0, 5)
  return <><button className="back-link" onClick={onBack}>← {copy.back}</button><header className="admin-student-hero"><AvatarImage value={detail.avatar} label={detail.nickname} /><div><small>#{detail.rank}</small><h1>{detail.nickname}</h1><p>{detail.grade ?? '—'} · {detail.school || '—'}</p></div><div className="admin-student-kpis"><b>{detail.xp}<small>XP</small></b><b>{detail.stars}<small>⭐</small></b><b>{detail.averageAccuracy}%<small>{copy.accuracy}</small></b><b>{detail.currentStreak}<small>🔥</small></b></div></header><section className="admin-private-contact"><span aria-hidden="true">🔐</span><div><small>{copy.privateContact}</small><strong>{copy.phone}: {phone ? formatPhone(phone) : '—'}</strong></div></section><section className="admin-progress-panel"><h2>{copy.progress}</h2>{progress.map((row) => { const section = sections.find((item) => item.id === row.sectionId); return <article key={row.sectionId}><div><strong>{section?.title[game.language] ?? row.sectionId}</strong><span>{row.completedLevels}/{row.totalLevels} · ⭐ {row.stars}</span></div><div className="admin-progress-bar"><i style={{ width: `${row.completionPercent}%` }} /></div><b>{row.completionPercent}%</b></article> })}</section>{weak.length > 0 && <section className="admin-weak-card"><h2>⚠ {game.language === 'kk' ? 'Қайталау қажет' : 'Нужно повторить'}</h2>{weak.map((row) => <span key={`${row.levelId}-${row.attemptNumber}`}>{levelTitle(row.levelId, game.language)} · {row.accuracy}%</span>)}</section>}<section className="admin-history"><h2>{copy.history}</h2>{history.length === 0 ? <p>{copy.noData}</p> : history.map((row) => <article key={`${row.levelId}-${row.completedAt}`}><div><strong>{levelTitle(row.levelId, game.language)}</strong><time>{formatDate(row.completedAt, game.language)}</time></div><span>{row.accuracy}%</span><span>{'⭐'.repeat(row.stars)}</span><span>{copy.attempts} {row.attemptNumber}</span><b>+{row.xpEarned} XP</b></article>)}</section></>
}

export const levelTitle = (id: string, language: 'kk' | 'ru') => levelById[id]?.title[language] ?? (id.startsWith('boss:') ? sections.find((section) => section.id === id.slice(5))?.bossTitle[language] : undefined) ?? id
