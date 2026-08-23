import { useEffect, useState } from 'react'
import { fetchAdminActivity } from '../services/adminService'
import { useGame } from '../store/GameStore'
import type { AdminActivity } from '../types/admin'
import { AdminError, AdminLoading } from './AdminDashboard'
import { levelTitle } from './AdminStudentDetail'
import { formatAdminDate as formatDate } from './adminFormat'
import { AvatarImage } from '../components/AvatarImage'

export function AdminMonitoring({ userId = null }: { userId?: string | null }) {
  const { progress } = useGame(); const kk = progress.language === 'kk'
  const [events, setEvents] = useState<AdminActivity[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [updated, setUpdated] = useState<Date | null>(null)
  const load = (quiet = false) => { if (!quiet) setLoading(true); setError(false); void fetchAdminActivity({ days: 1, eventType: null, grade: null, page: 0, userId, search: '' }).then((rows) => { setEvents(rows); setUpdated(new Date()) }).catch(() => setError(true)).finally(() => setLoading(false)) }
  useEffect(() => { load(); const timer = window.setInterval(() => load(true), 15_000); return () => window.clearInterval(timer) }, [userId])
  if (loading && !events.length) return <AdminLoading />
  if (error && !events.length) return <AdminError onRetry={() => load()} />
  const latest = new Map<string, AdminActivity>(); for (const event of events) if (!latest.has(event.userId)) latest.set(event.userId, event)
  const todayXp = events.reduce((sum, event) => sum + Number(event.metadata.awarded_xp ?? 0), 0)
  return <><header className="admin-page-heading admin-heading-actions"><div><small>CONTROLLED REFRESH · 15 SEC</small><h1>{kk ? 'Ойын барысы' : 'Игровой процесс'}</h1><p>{kk ? 'Соңғы маңызды оқу әрекеттері. Бұл экранды тікелей жазу емес.' : 'Последние значимые учебные события. Это не запись экрана и не точный online-статус.'}</p></div><button className="secondary-button" onClick={() => load()}>↻ {kk ? 'Жаңарту' : 'Обновить'}</button></header><section className="monitor-summary"><span><b>{latest.size}</b>{kk ? 'Соңғы 24 сағатта' : 'За последние 24 часа'}</span><span><b>{events.filter((event) => event.eventType.includes('COMPLETED')).length}</b>{kk ? 'Аяқталған әрекет' : 'Завершений'}</span><span><b>{todayXp}</b>XP {kk ? 'оқиғаларда' : 'в событиях'}</span><small>{updated ? `${kk ? 'Жаңартылды' : 'Обновлено'} ${updated.toLocaleTimeString(kk ? 'kk-KZ' : 'ru-RU')}` : ''}</small></section><div className="monitor-layout"><section className="monitor-students"><h2>{kk ? 'Жақында белсенді' : 'Недавно активны'}</h2>{[...latest.values()].map((event) => <article key={event.userId}><AvatarImage value={event.avatar} label={event.nickname} /><div><strong>{event.nickname}</strong><p>{event.levelId ? levelTitle(event.levelId, progress.language) : label(event.eventType, kk)}</p><small>{formatDate(event.createdAt, progress.language)}</small></div><i className={Date.now() - new Date(event.createdAt).getTime() < 15 * 60_000 ? 'recent' : ''} /></article>)}</section><section className="monitor-feed"><h2>{kk ? 'Соңғы әрекеттер' : 'Лента активности'}</h2>{events.map((event) => <article key={event.id}><time>{new Intl.DateTimeFormat(kk ? 'kk-KZ' : 'ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.createdAt))}</time><AvatarImage value={event.avatar} label={event.nickname} /><div><strong>{event.nickname}</strong><p>{label(event.eventType, kk)}{event.levelId ? ` · ${levelTitle(event.levelId, progress.language)}` : ''}</p>{event.metadata.accuracy != null && <small>{String(event.metadata.accuracy)}% · +{String(event.metadata.awarded_xp ?? 0)} XP</small>}</div></article>)}</section></div></>
}

const label = (event: string, kk: boolean) => ({ LOGIN: kk ? 'Жүйеге кірді' : 'Вошёл в игру', LEVEL_STARTED: kk ? 'Деңгейді бастады' : 'Начал уровень', LEVEL_COMPLETED: kk ? 'Деңгейді аяқтады' : 'Завершил уровень', CHALLENGE_COMPLETED: kk ? 'Ғылыми сынақты аяқтады' : 'Завершил Challenge', ACHIEVEMENT_EARNED: kk ? 'Жетістік алды' : 'Получил достижение', PROFILE_UPDATED: kk ? 'Профильді жаңартты' : 'Обновил профиль' }[event] ?? event)
