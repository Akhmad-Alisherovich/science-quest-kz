import { useEffect, useMemo, useState } from 'react'
import { achievementCategoryLabels, achievements, rarityLabel } from '../content/achievements'
import { ui } from '../content/ui'
import { fetchMyAchievements, setMyProfileTitle } from '../services/achievementService'
import { useGame } from '../store/GameStore'
import { useOnline } from '../store/OnlineStore'
import type { AchievementCategory, AchievementState } from '../types/game'

type StatusFilter = 'all'|'unlocked'|'locked'|'hidden'

export function AchievementsPage({ onBack }: { onBack: () => void }) {
  const { progress } = useGame()
  const { status, connect } = useOnline()
  const copy = ui(progress.language)
  const kk = progress.language === 'kk'
  const fallback = useMemo<AchievementState[]>(() => achievements.map((achievement) => {
    const unlocked = progress.achievements.includes(achievement.id)
    const secret = achievement.hidden && !unlocked
    return { ...achievement, icon:secret?'❓':achievement.icon,title:secret?{kk:'Құпия жетістік',ru:'Секретное достижение'}:achievement.title,description:secret?{kk:'Шартын өзің анықта!',ru:'Узнай условие сам!'}:achievement.description,rewardXp:secret?0:achievement.rewardXp,rewardCrystals:secret?0:achievement.rewardCrystals,current:secret?null:unlocked?achievement.target:0,unlocked,earnedAt:null,selectedTitle:false }
  }), [progress.achievements])
  const [items, setItems] = useState<AchievementState[]>(fallback)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [category, setCategory] = useState<AchievementCategory|null>(null)
  const [savingTitle, setSavingTitle] = useState(false)

  const load = () => {
    if (status !== 'ready') return
    void fetchMyAchievements().then(setItems).catch(() => setItems(fallback))
  }
  useEffect(load, [status, fallback])

  const unlocked = items.filter((achievement) => achievement.unlocked).length
  const percent = items.length ? Math.round(unlocked / items.length * 100) : 0
  const visible = items.filter((achievement) => {
    if (category && achievement.category !== category) return false
    if (statusFilter === 'unlocked') return achievement.unlocked
    if (statusFilter === 'locked') return !achievement.unlocked && !achievement.hidden
    if (statusFilter === 'hidden') return achievement.hidden
    return true
  })
  const titles = items.filter((achievement) => achievement.unlocked && achievement.rewardTitle)
  const selectedTitle = titles.find((achievement) => achievement.selectedTitle)?.id ?? ''

  const chooseTitle = async (code: string) => {
    setSavingTitle(true)
    try {
      await setMyProfileTitle(code || null)
      setItems((current) => current.map((achievement) => ({ ...achievement, selectedTitle: achievement.id === code })))
      await connect()
    } finally { setSavingTitle(false) }
  }

  return <main className="page-container achievements-page">
    <button className="back-link" onClick={onBack}>← {copy.back}</button>
    <header className="achievement-page-heading"><span>🏆</span><div><small>SCIENCE QUEST KZ</small><h1>{copy.achievements}</h1><p>{kk ? 'Нақты оқу әрекеттері мен ғылыми ойлау жолы' : 'Реальные учебные действия и развитие научного мышления'}</p></div></header>

    <section className="achievement-summary">
      <div><small>{kk ? 'Ашылды' : 'Открыто'}</small><strong>{unlocked} / {items.length}</strong></div>
      <div><small>{kk ? 'Жалпы прогресс' : 'Общий прогресс'}</small><strong>{percent}%</strong></div>
      <div className="achievement-total-progress" aria-label={`${percent}%`}><i style={{ width: `${percent}%` }} /></div>
      {titles.length > 0 && <label><span>{kk ? 'Профиль атағы' : 'Титул профиля'}</span><select value={selectedTitle} disabled={savingTitle} onChange={(event) => void chooseTitle(event.target.value)}><option value="">{kk ? 'Атақсыз' : 'Без титула'}</option>{titles.map((achievement) => <option key={achievement.id} value={achievement.id}>{achievement.rewardTitle?.[progress.language]}</option>)}</select></label>}
    </section>

    <nav className="achievement-status-filters" aria-label={kk ? 'Жетістік күйі' : 'Статус достижения'}>{([
      ['all',kk?'Барлығы':'Все'],['unlocked',kk?'Ашылған':'Открытые'],['locked',kk?'Жабық':'Закрытые'],['hidden',kk?'Құпия':'Скрытые'],
    ] as [StatusFilter,string][]).map(([value,label]) => <button key={value} className={statusFilter===value?'active':''} onClick={() => setStatusFilter(value)}>{label}</button>)}</nav>

    <nav className="achievement-category-filters" aria-label={kk ? 'Жетістік санаты' : 'Категория достижения'}><button className={!category?'active':''} onClick={() => setCategory(null)}>{kk?'Барлық санат':'Все категории'}</button>{Object.entries(achievementCategoryLabels).map(([id,meta]) => <button key={id} className={category===id?'active':''} onClick={() => setCategory(id as AchievementCategory)}>{meta.icon} {meta.title[progress.language]}</button>)}</nav>

    <section className="achievement-grid enhanced">{visible.map((achievement) => {
      const current = achievement.current ?? 0
      const progressPercent = achievement.unlocked ? 100 : Math.min(100, Math.round(current / Math.max(achievement.target, 1) * 100))
      return <article key={achievement.id} className={`achievement-card rarity-${achievement.rarity.toLowerCase()} ${achievement.unlocked?'unlocked':'locked'} ${achievement.hidden&&!achievement.unlocked?'secret':''}`}>
        <header><span>{achievement.unlocked ? achievement.icon : achievement.hidden ? '❓' : '🔒'}</span><b>{rarityLabel(achievement.rarity,progress.language)}</b></header>
        <h2>{achievement.title[progress.language]}</h2><p>{achievement.description[progress.language]}</p>
        {!achievement.hidden || achievement.unlocked ? <div className="achievement-card-progress"><span>{current} / {achievement.target}</span><div><i style={{width:`${progressPercent}%`}} /></div></div> : <div className="achievement-secret-note">{kk?'Шартын өзің анықта!':'Узнай условие сам!'}</div>}
        {(achievement.unlocked || !achievement.hidden) && <footer><strong>+{achievement.rewardXp} XP{achievement.rewardCrystals>0?` · 💎${achievement.rewardCrystals}`:''}</strong>{achievement.earnedAt && <time>{kk?'Алынды':'Получено'}: {new Intl.DateTimeFormat(kk?'kk-KZ':'ru-RU').format(new Date(achievement.earnedAt))}</time>}</footer>}
      </article>
    })}</section>
    {visible.length === 0 && <p className="achievement-empty">{copy.noResults}</p>}
  </main>
}
