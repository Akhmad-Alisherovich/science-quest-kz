import { useMemo, useState } from 'react'
import { levels } from '../content/levels'
import { sections } from '../content/sections'
import { topics } from '../content/topics'
import type { LearningAccess } from '../types/learning'
import { AdminInlineAccess } from './AdminInlineAccess'

export function AdminStudentContentActions({ userId, mode, access, language, onChanged }: {
  userId: string
  mode: 'topics' | 'quests'
  access: LearningAccess[]
  language: 'kk' | 'ru'
  onChanged: () => void
}) {
  const kk = language === 'kk'
  const [search, setSearch] = useState('')
  const rows = useMemo(() => {
    const all = mode === 'topics'
      ? topics.map((topic) => ({ type: 'topic' as const, id: topic.id, icon: topic.icon, titleKk: topic.title.kk, titleRu: topic.title.ru }))
      : [
          ...levels.map((level) => ({ type: 'level' as const, id: level.id, icon: level.difficulty === 4 ? '🔥' : level.difficulty === 3 ? '🧪' : '🧭', titleKk: level.title.kk, titleRu: level.title.ru })),
          ...sections.map((section) => ({ type: 'boss' as const, id: `boss:${section.id}`, icon: '🏆', titleKk: section.bossTitle.kk, titleRu: section.bossTitle.ru })),
        ]
    const needle = search.trim().toLocaleLowerCase()
    return needle ? all.filter((item) => `${item.id} ${item.titleKk} ${item.titleRu}`.toLocaleLowerCase().includes(needle)) : all
  }, [mode, search])

  return <section className="admin-exact-access">
    <header><div><small>{kk ? 'ОСЫ ОҚУШЫ ҮШІН' : 'ДЛЯ ЭТОГО УЧЕНИКА'}</small><h2>{mode === 'topics' ? (kk ? 'Тақырып қолжетімділігі' : 'Доступ к темам') : (kk ? 'Квест қолжетімділігі' : 'Доступ к квестам')}</h2></div><span>👤</span></header>
    <label className="exact-access-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={kk ? 'Атауы немесе ID бойынша іздеу' : 'Поиск по названию или ID'} /></label>
    <div>{rows.map((item) => {
      const state = access.find((entry) => entry.contentType === item.type && entry.contentId === item.id)?.accessState ?? 'locked'
      return <article key={`${item.type}:${item.id}`}><span>{item.icon}</span><div><strong>{kk ? item.titleKk : item.titleRu}</strong><small>{item.id} · {state}</small></div><AdminInlineAccess userId={userId} contentType={item.type} contentId={item.id} titleKk={item.titleKk} titleRu={item.titleRu} kk={kk} onChanged={onChanged} /></article>
    })}</div>
  </section>
}
