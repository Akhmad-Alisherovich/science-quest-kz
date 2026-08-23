import { useMemo, useState, type FormEvent } from 'react'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { useAuth } from '../store/AuthStore'
import { useGame } from '../store/GameStore'
import { scienceAvatars, type ScienceAvatar } from '../types/leaderboard'

type AdminPreferences = { displayName: string; avatar: ScienceAvatar }
const keyFor = (userId: string) => `science-quest-kz-admin-profile-v1:${userId}`

export function AdminProfile() {
  const auth = useAuth(); const { progress } = useGame(); const kk = progress.language === 'kk'
  const initial = useMemo<AdminPreferences>(() => {
    try { return JSON.parse(localStorage.getItem(keyFor(auth.user?.id ?? 'unknown')) ?? '') as AdminPreferences } catch { return { displayName: 'Administrator', avatar: '🧑‍🔬' } }
  }, [auth.user?.id])
  const [name, setName] = useState(initial.displayName); const [avatar, setAvatar] = useState<ScienceAvatar>(initial.avatar); const [saved, setSaved] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); if (!auth.user) return; localStorage.setItem(keyFor(auth.user.id), JSON.stringify({ displayName: name.trim() || 'Administrator', avatar } satisfies AdminPreferences)); setSaved(true) }
  return <><header className="admin-page-heading"><small>ADMINISTRATOR</small><h1>{kk ? 'Менің профилім' : 'Мой профиль'}</h1></header><form className="admin-profile-card" onSubmit={submit}><div className="admin-profile-identity"><span>{avatar}</span><div><h2>{name}</h2><p>{auth.user?.email ?? '—'}</p><b>{kk ? 'Рөлі: Әкімші' : 'Роль: Administrator'}</b></div></div><label>{kk ? 'Көрсетілетін ат' : 'Отображаемое имя'}<input value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setSaved(false) }} /></label><fieldset className="avatar-picker"><legend>{kk ? 'Аватар' : 'Аватар'}</legend>{scienceAvatars.map((item) => <button type="button" key={item} className={avatar === item ? 'selected' : ''} onClick={() => { setAvatar(item); setSaved(false) }}>{item}</button>)}</fieldset><div className="admin-profile-language"><strong>{kk ? 'Интерфейс тілі' : 'Язык интерфейса'}</strong><LanguageSwitch /></div><p className="admin-safe-note">🔒 {kk ? 'Бұл бөлек әкімші профилі. Ол оқушылар рейтингіне қосылмайды және рөлді өзгертпейді.' : 'Это отдельный локальный профиль администратора. Он не добавляется в рейтинг учеников и не меняет роль.'}</p>{saved && <p className="admin-notice">{kk ? 'Профиль сақталды.' : 'Профиль сохранён.'}</p>}<button className="primary-button" type="submit">{kk ? 'Сақтау' : 'Сохранить'}</button></form></>
}
