import { useCallback, useEffect, useMemo, useState } from 'react'
import { sections } from '../content/sections'
import { ui } from '../content/ui'
import { fetchLeaderboard, fetchMyRank } from '../services/leaderboardService'
import { useGame } from '../store/GameStore'
import { useOnline } from '../store/OnlineStore'
import type { LeaderboardEntry, LeaderboardPeriod, MyLeaderboardRank } from '../types/leaderboard'
import { OnlineProfileForm } from '../components/OnlineProfileForm'
import { LeaderboardSkeleton } from '../components/LeaderboardSkeleton'
import { AvatarImage } from '../components/AvatarImage'

type BoardScope = LeaderboardPeriod | 'section' | 'class'

export function LeaderboardPage({ onBack }: { onBack: () => void }) {
  const { progress } = useGame()
  const { configured, status, profile, refreshVersion, connect } = useOnline()
  const copy = ui(progress.language)
  const [scope, setScope] = useState<BoardScope>('total')
  const [sectionId, setSectionId] = useState(sections[0].id)
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<MyLeaderboardRank | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const filters = useMemo(() => {
    const period: LeaderboardPeriod = scope === 'week' || scope === 'month' ? scope : 'total'
    return { period, section: scope === 'section' ? sectionId : null, grade: scope === 'class' ? profile?.grade ?? null : null }
  }, [scope, sectionId, profile?.grade])

  const load = useCallback(async () => {
    if (status !== 'ready' || !profile) return
    if (scope === 'class' && (!profile.grade || !profile.showGrade)) { setRows([]); setMyRank(null); return }
    setLoading(true); setError(false)
    try {
      const [entries, mine] = await Promise.all([
        fetchLeaderboard(filters.period, filters.section, filters.grade, page),
        fetchMyRank(filters.period, filters.section, filters.grade),
      ])
      setRows(entries); setMyRank(mine)
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [status, profile, scope, filters, page])

  useEffect(() => { void load() }, [load, refreshVersion])
  useEffect(() => { setPage(0) }, [scope, sectionId])

  const changeScope = (next: BoardScope) => { setScope(next); setPage(0) }
  const top = page === 0 ? rows.slice(0, 3) : []
  const totalCount = rows[0]?.totalCount ?? myRank?.totalCount ?? 0

  return <main className="leaderboard-page page-container">
    <button className="back-link" onClick={onBack}>← {copy.back}</button>
    <header className="leaderboard-heading"><span>🏆</span><div><small>SCIENCE QUEST KZ</small><h1>{copy.studentsLeaderboard}</h1><p>{copy.leaderboardPrivacy}</p></div></header>

    {!configured && <section className="online-state-card"><span>🔌</span><div><h2>{copy.leaderboard}</h2><p>{copy.leaderboardNotConfigured}</p></div></section>}
    {configured && (status === 'offline' || status === 'error') && <section className="online-state-card"><span>📡</span><div><h2>{status === 'offline' ? copy.leaderboardUnavailable : copy.backendUnavailable}</h2><button className="secondary-button" onClick={() => void connect()}>{copy.retryConnection}</button></div></section>}
    {configured && status === 'connecting' && <LeaderboardSkeleton />}
    {configured && status === 'ready' && !profile && <OnlineProfileForm />}

    {configured && status === 'ready' && profile && <>
      <div className="leaderboard-tabs" role="tablist">
        {([['total', copy.overall], ['week', copy.thisWeek], ['month', copy.thisMonth], ['section', copy.bySection], ['class', copy.myClass]] as [BoardScope, string][]).map(([value, label]) => <button key={value} role="tab" aria-selected={scope === value} className={scope === value ? 'active' : ''} onClick={() => changeScope(value)}>{label}</button>)}
      </div>
      {scope === 'section' && <label className="section-filter"><span>{copy.bySection}</span><select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>{sections.map((section) => <option key={section.id} value={section.id}>{section.title[progress.language]}</option>)}</select></label>}
      {scope === 'class' && (!profile.grade || !profile.showGrade) && <section className="online-state-card compact"><span>🎒</span><p>{progress.language === 'kk' ? 'Сынып рейтингін көру үшін профильде сыныпты көрсетіп, оны рейтингте көрсетуге рұқсат беріңіз.' : 'Укажите класс в профиле и разрешите показывать его, чтобы открыть рейтинг класса.'}</p></section>}

      <details className="scoring-rules"><summary>💡 {copy.scoringSystem}</summary><div><span>{copy.know}<strong>+40 XP</strong></span><span>{copy.understand}<strong>+55 XP</strong></span><span>{copy.apply}<strong>+70 XP</strong></span><span>{copy.challenge}<strong>+100 XP · 🔥 30</strong></span><span>{copy.boss}<strong>+250 XP · 🔥 50</strong></span><span>⭐⭐⭐<strong>+20 XP</strong></span><p>{copy.repeatNoXp}</p></div></details>

      {top.length > 0 && <section className="leaderboard-podium" aria-label="Top 3">{top.map((item, index) => <article key={item.nickname} className={`podium-card podium-${index + 1}`}><span className="podium-medal">{['🥇','🥈','🥉'][index]}</span><AvatarImage className="podium-avatar" value={item.avatar} label={item.nickname} /><strong>{item.nickname}</strong>{item.title&&<small className="podium-title">{item.title[progress.language]}</small>}<b>{item.xp.toLocaleString()} XP</b><small>⭐ {item.stars}</small></article>)}</section>}

      {myRank && <section className="my-rank-card"><div><small>{copy.myPlace}</small><strong>#{myRank.rank}</strong></div><div><AvatarImage value={myRank.avatar} label={myRank.nickname} /><b>{myRank.nickname}</b>{myRank.title&&<small className="leaderboard-title">{myRank.title[progress.language]}</small>}<small>{myRank.xp.toLocaleString()} XP · ⭐ {myRank.stars}</small></div><p>{copy.nextPlace}<strong>{myRank.xpToNext.toLocaleString()} XP</strong></p></section>}

      {loading ? <LeaderboardSkeleton /> : error ? <section className="online-state-card compact"><span>📡</span><p>{navigator.onLine ? copy.backendUnavailable : copy.leaderboardUnavailable}</p><button className="secondary-button" onClick={() => void load()}>{copy.retryConnection}</button></section> : rows.length === 0 && !(scope === 'class' && (!profile.grade || !profile.showGrade)) ? <p className="empty-leaderboard">{copy.noResults}</p> : <section className="leaderboard-list" aria-label={copy.studentsLeaderboard}>
        <div className="leaderboard-list-head"><span>#</span><span>{copy.nickname}</span><span>XP</span><span>⭐</span><span>🔥</span><span>{copy.completedLevels}</span></div>
        {rows.map((item) => <article key={`${item.rank}-${item.nickname}`} className={item.isCurrent ? 'leaderboard-row current' : 'leaderboard-row'}>
          <b className="leaderboard-position">{item.rank <= 3 ? ['🥇','🥈','🥉'][item.rank - 1] : `#${item.rank}`}</b>
          <div className="leaderboard-student"><AvatarImage value={item.avatar} label={item.nickname} /><div><strong>{item.isCurrent ? `${item.nickname} · ${progress.language === 'kk' ? 'Сіз' : 'Вы'}` : item.nickname}</strong>{item.title&&<small className="leaderboard-title">{item.title[progress.language]}</small>}{item.grade && <small>{item.grade} {progress.language === 'kk' ? 'сынып' : 'класс'}</small>}</div></div>
          <strong className="leaderboard-xp">{item.xp.toLocaleString()} XP</strong><span>⭐ {item.stars}</span><span>🔥 {item.challengePoints}</span><span>{item.completedLevels}</span>
        </article>)}
      </section>}

      {totalCount > 50 && <nav className="leaderboard-pagination"><button className="secondary-button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>← {copy.previousPage}</button><span>{page + 1} / {Math.ceil(totalCount / 50)}</span><button className="secondary-button" disabled={(page + 1) * 50 >= totalCount} onClick={() => setPage((value) => value + 1)}>{copy.nextPage} →</button></nav>}
    </>}
  </main>
}
