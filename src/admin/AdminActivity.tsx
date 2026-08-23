import { useEffect, useMemo, useState } from 'react'
import { adminCopy } from '../content/admin'
import { fetchAdminActivity } from '../services/adminService'
import { useGame } from '../store/GameStore'
import type { AdminActivity as Activity } from '../types/admin'
import { AdminError, AdminLoading } from './AdminDashboard'
import { levelTitle } from './AdminStudentDetail'
import { formatAdminDate as formatDate } from './adminFormat'
import { AvatarImage } from '../components/AvatarImage'

export function AdminActivity({ presetEvent = '' }: { presetEvent?: string }) {
  const { progress } = useGame(); const copy = adminCopy(progress.language)
  const [days, setDays] = useState(7); const [eventType, setEventType] = useState(presetEvent); const [grade, setGrade] = useState<number | null>(null); const [search, setSearch] = useState(''); const [page, setPage] = useState(0); const [rows, setRows] = useState<Activity[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(false)
  const filters = useMemo(() => ({ days, eventType: eventType || null, grade, search, page }), [days,eventType,grade,search,page])
  const load=()=>{setLoading(true);setError(false);void fetchAdminActivity(filters).then(setRows).catch(()=>setError(true)).finally(()=>setLoading(false))}
  useEffect(()=>{const timer=window.setTimeout(load,250);return()=>window.clearTimeout(timer)},[filters]); const total=rows[0]?.totalCount??0
  return <><header className="admin-page-heading"><small>ADMIN</small><h1>{presetEvent ? copy.achievements : copy.activity}</h1></header><section className="admin-filters"><input value={search} onChange={(e)=>{setSearch(e.target.value);setPage(0)}} placeholder={copy.search} aria-label={copy.search}/><select value={days} onChange={(e)=>setDays(Number(e.target.value))}><option value="1">{copy.today}</option><option value="7">{copy.week}</option><option value="30">{copy.month}</option></select><select value={eventType} onChange={(e)=>setEventType(e.target.value)}><option value="">{copy.allActivity}</option>{['LOGIN','LEVEL_STARTED','LEVEL_COMPLETED','CHALLENGE_COMPLETED','ACHIEVEMENT_EARNED','PROFILE_UPDATED'].map((event)=><option key={event}>{event}</option>)}</select><select value={grade??''} onChange={(e)=>setGrade(e.target.value?Number(e.target.value):null)}><option value="">{copy.allGrades}</option><option value="5">{copy.grade5}</option><option value="6">{copy.grade6}</option></select></section>{loading?<AdminLoading/>:error?<AdminError onRetry={load}/>:rows.length===0?<p className="admin-empty">{copy.noData}</p>:<section className="admin-activity-list">{rows.map((row)=><article key={row.id}><time>{formatDate(row.createdAt,progress.language)}</time><AvatarImage value={row.avatar} label={row.nickname} /><div><strong>{row.nickname}</strong><p>{eventLabel(row.eventType,progress.language)}{row.levelId?`: ${levelTitle(row.levelId,progress.language)}`:''}</p>{row.metadata.accuracy!=null&&<small>{String(row.metadata.accuracy)}% · +{String(row.metadata.awarded_xp??0)} XP</small>}</div></article>)}</section>}<nav className="admin-pagination"><button disabled={page===0} onClick={()=>setPage(v=>v-1)}>←</button><span>{page+1}/{Math.max(1,Math.ceil(total/50))}</span><button disabled={(page+1)*50>=total} onClick={()=>setPage(v=>v+1)}>→</button></nav></>
}
const eventLabel=(event:string,language:'kk'|'ru')=>({LOGIN:language==='kk'?'Жүйеге кірді':'Вход',LEVEL_STARTED:language==='kk'?'Деңгейді бастады':'Начат уровень',LEVEL_COMPLETED:language==='kk'?'Деңгейді аяқтады':'Уровень завершён',CHALLENGE_COMPLETED:language==='kk'?'Ғылыми сынақты аяқтады':'Challenge завершён',ACHIEVEMENT_EARNED:language==='kk'?'Жетістік алды':'Получено достижение',PROFILE_UPDATED:language==='kk'?'Профильді жаңартты':'Профиль обновлён'}[event]??event)
