import { useEffect, useState } from 'react'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { adminCopy } from '../content/admin'
import { useAuth } from '../store/AuthStore'
import { useGame } from '../store/GameStore'
import { AdminActivity } from './AdminActivity'
import { AdminAnalytics } from './AdminAnalytics'
import { AdminDashboard } from './AdminDashboard'
import { AdminLeaderboard } from './AdminLeaderboard'
import { AdminStudents } from './AdminStudents'
import { AdminAssignments } from './AdminAssignments'
import { AdminContentControl } from './AdminContentControl'
import { AdminMonitoring } from './AdminMonitoring'
import { AdminSitePreview } from './AdminSitePreview'
import { AdminProfile } from './AdminProfile'
import { BackendStatus } from '../components/BackendStatus'

type AdminView='dashboard'|'students'|'assignments'|'content'|'monitoring'|'leaderboard'|'activity'|'analytics'|'preview'|'profile'|'settings'

export function AdminApp({ onGame }: { onGame: () => void }) {
  const {progress}=useGame(); const {logout}=useAuth(); const copy=adminCopy(progress.language); const [view,setView]=useState<AdminView>('dashboard'); const [menu,setMenu]=useState(false); const [managedUsers,setManagedUsers]=useState<string[]>([]); const kk=progress.language==='kk'
  useEffect(() => {
    if (!menu) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menu])
  const items:[AdminView,string,string][]=[['dashboard',copy.dashboard,'▦'],['students',copy.students,'🧑‍🎓'],['assignments',kk?'Тапсырмалар':'Назначения','📌'],['content',kk?'Тақырыптар мен квесттер':'Темы и квесты','🧭'],['monitoring',kk?'Ойын барысы':'Игровой процесс','◉'],['leaderboard',copy.leaderboard,'🏆'],['activity',copy.activity,'⚡'],['analytics',copy.analytics,'📊'],['preview',kk?'Сайтты алдын ала қарау':'Предпросмотр сайта','🖥'],['profile',kk?'Менің профилім':'Мой профиль','👤'],['settings',copy.settings,'⚙']]
  const select=(next:AdminView)=>{setView(next);setMenu(false);window.scrollTo({top:0})}
  const manageContent=(userIds:string[])=>{setManagedUsers(userIds);setView('content');setMenu(false);window.scrollTo({top:0})}
  return <div className="admin-shell"><header className="admin-mobile-header"><button aria-label={kk?'Мәзір':'Меню'} onClick={()=>setMenu(true)}>☰</button><strong>SCIENCE QUEST <em>ADMIN</em></strong></header>{menu&&<button className="admin-backdrop" aria-label={kk?'Мәзірді жабу':'Закрыть меню'} onClick={()=>setMenu(false)}/>}<aside className={menu?'admin-sidebar open':'admin-sidebar'}><button className="admin-sidebar-close" type="button" aria-label={kk?'Мәзірді жабу':'Закрыть меню'} onClick={()=>setMenu(false)}>×</button><div className="admin-brand"><span>⚛</span><div><strong>SCIENCE QUEST</strong><small>LEARNING CONSOLE</small></div></div><nav>{items.map(([id,label,icon])=><button className={view===id?'active':''} key={id} onClick={()=>select(id)}><span>{icon}</span>{label}</button>)}</nav><footer><LanguageSwitch/><button onClick={onGame}>🎮 {copy.game}</button><button onClick={()=>void logout()}>↪ {copy.logout}</button></footer></aside><main className="admin-content">{view==='dashboard'&&<AdminDashboard/>}{view==='students'&&<AdminStudents onManageContent={manageContent}/>} {view==='assignments'&&<AdminAssignments initialStudentIds={managedUsers}/>} {view==='content'&&<AdminContentControl key={managedUsers.join(',')} initialUsers={managedUsers}/>} {view==='monitoring'&&<AdminMonitoring/>}{view==='leaderboard'&&<AdminLeaderboard/>}{view==='activity'&&<AdminActivity/>}{view==='analytics'&&<AdminAnalytics/>}{view==='preview'&&<AdminSitePreview/>}{view==='profile'&&<AdminProfile/>}{view==='settings'&&<section className="admin-settings"><header className="admin-page-heading"><small>SECURITY</small><h1>{copy.settings}</h1></header><p>🔐 {copy.secureNote}</p><p>{kk?'Барлық оқу маршруты өзгерістері серверде тексеріліп, аудит журналына жазылады.':'Все изменения учебных маршрутов проверяются сервером и записываются в аудит.'}</p>{import.meta.env.DEV && <div className="admin-developer-status"><h2>Developer / System Status</h2><BackendStatus /></div>}</section>}</main></div>
}
