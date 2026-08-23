import { useEffect, useMemo, useState } from 'react'
import { ui } from '../content/ui'
import { fetchLeaderboard, fetchMyRank, fetchNearbyRivals } from '../services/leaderboardService'
import { useGame } from '../store/GameStore'
import { useOnline } from '../store/OnlineStore'
import type { LeaderboardEntry, MyLeaderboardRank } from '../types/leaderboard'
import { LeaderboardSkeleton } from './LeaderboardSkeleton'
import { AvatarImage } from './AvatarImage'

export function LeaderboardPreview({ onOpen }: { onOpen: () => void }) {
  const { progress } = useGame()
  const { configured, status, profile, refreshVersion, connect } = useOnline()
  const copy = ui(progress.language)
  const kk = progress.language === 'kk'
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([])
  const [nearby, setNearby] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<MyLeaderboardRank | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    if (status !== 'ready' || !profile) return
    let active = true
    setLoading(true)
    setLoadError(false)
    void Promise.all([fetchLeaderboard('week', null, null), fetchNearbyRivals(), fetchMyRank('total', null, null)]).then(([top, rivals, mine]) => {
      if (active) { setLeaders(top.slice(0, 3)); setNearby(rivals); setMyRank(mine) }
    }).catch(() => { if (active) setLoadError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [status, profile, refreshVersion, retryVersion])

  const rival = useMemo(() => {
    if (!nearby.length) return null
    const currentRank = myRank?.rank ?? nearby.find((item) => item.isCurrent)?.rank ?? 0
    return [...nearby].filter((item) => !item.isCurrent).sort((a, b) => Math.abs(a.rank - currentRank) - Math.abs(b.rank - currentRank))[0] ?? nearby[0]
  }, [nearby, myRank])

  const retry = () => {
    if (status === 'offline' || status === 'error') void connect()
    setRetryVersion((value) => value + 1)
  }

  if (!configured || status === 'offline' || status === 'error' || loadError) {
    const message = !configured ? copy.leaderboardNotConfigured : status === 'offline' ? copy.leaderboardUnavailable : copy.backendUnavailable
    return <><article className="home-dashboard-card home-board-card home-board-status"><header><small>🏆 {copy.weeklyLeaders}</small></header><p>{message}</p></article><article className="home-dashboard-card home-board-card home-rival-card"><header><small>🎯 {copy.nearbyRivals}</small></header><p>{message}</p><button className="home-rating-link" onClick={!configured ? onOpen : retry}>{!configured ? copy.fullLeaderboard : copy.retryConnection} →</button></article></>
  }

  if (status === 'connecting' || loading) return <><article className="home-dashboard-card home-board-card"><header><small>🏆 {copy.weeklyLeaders}</small></header><LeaderboardSkeleton compact /></article><article className="home-dashboard-card home-board-card"><header><small>🎯 {copy.nearbyRivals}</small></header><LeaderboardSkeleton compact /></article></>
  if (!profile || status !== 'ready') return null

  return <>
    <article className="home-dashboard-card home-board-card home-leaders-card">
      <header><small>🏆 {copy.weeklyLeaders}</small></header>
      <div className="home-leader-list">{leaders.length > 0 ? leaders.map((item, index) => <div key={item.nickname} className="home-rank-row"><b>{['🥇','🥈','🥉'][index]}</b><AvatarImage value={item.avatar} label={item.nickname} /><span><em>{item.nickname}</em>{item.title&&<small className="home-rank-title">{item.title[progress.language]}</small>}</span><strong>{item.xp.toLocaleString()} XP</strong></div>) : <p className="home-empty-row">{kk ? 'Әзірге дерек жоқ' : 'Данных пока нет'}</p>}</div>
    </article>
    <article className="home-dashboard-card home-board-card home-rival-card">
      <header><small>🎯 {copy.nearbyRivals}</small></header>
      {rival ? <div className="home-rank-row home-rival-row"><b>#{rival.rank}</b><AvatarImage value={rival.avatar} label={rival.nickname} /><span><em>{rival.nickname}</em>{rival.title&&<small className="home-rank-title">{rival.title[progress.language]}</small>}</span><strong>{rival.xp.toLocaleString()} XP</strong></div> : <p className="home-empty-row">{kk ? 'Әзірге дерек жоқ' : 'Данных пока нет'}</p>}
      <p className="home-next-rank">{copy.nextPlace}: <strong>{myRank?.xpToNext ?? 0} XP</strong></p>
      <button className="home-rating-link" onClick={onOpen}>{copy.fullLeaderboard} →</button>
      <span className="home-current-rank">{myRank ? `${kk ? 'Сіздің орныңыз' : 'Ваше место'}: #${myRank.rank}` : kk ? 'Рейтинг күтілуде' : 'Рейтинг загружается'}</span>
    </article>
  </>
}
