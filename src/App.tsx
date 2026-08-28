import { lazy, Suspense, useEffect, useState } from 'react'
import { AchievementModal } from './components/AchievementModal'
import { AppHeader } from './components/AppHeader'
import { useGame } from './store/GameStore'
import type { Route } from './types/game'
import { TypographyTest } from './components/TypographyTest'
import { MobileNavigation } from './components/MobileNavigation'
import { RankMovementToast } from './components/RankMovementToast'
import { useAuth } from './store/AuthStore'
import { useOnline } from './store/OnlineStore'
import type { AuthView } from './auth/AuthPage'
import { AdminRoute } from './admin/AdminRoute'
import { logLevelStarted } from './services/authService'
import { useLearning } from './store/LearningStore'
import { levelById, levels } from './content/levels'
import type { LearningContentType } from './types/learning'
import { useMusic, type MusicScene } from './audio/MusicProvider'

const GameMap = lazy(() => import('./game/GameMap').then((module) => ({ default: module.GameMap })))
const BossMission = lazy(() => import('./game/BossMission').then((module) => ({ default: module.BossMission })))
const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const PublicLandingPage = lazy(() => import('./pages/PublicLandingPage').then((module) => ({ default: module.PublicLandingPage })))
const LevelPage = lazy(() => import('./pages/LevelPage').then((module) => ({ default: module.LevelPage })))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage').then((module) => ({ default: module.AchievementsPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((module) => ({ default: module.LeaderboardPage })))
const AuthPage = lazy(() => import('./auth/AuthPage').then((module) => ({ default: module.AuthPage })))
const ProfileSetupPage = lazy(() => import('./auth/ProfileSetupPage').then((module) => ({ default: module.ProfileSetupPage })))
const AdminApp = lazy(() => import('./admin/AdminApp').then((module) => ({ default: module.AdminApp })))

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password'])

export function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('typography-test')) {
    return <TypographyTest />
  }
  return <Suspense fallback={<AppLoading />}><AppRouter /></Suspense>
}

function AppLoading() {
  return <main className="app-loading" aria-live="polite"><span className="admin-spinner" /><strong>SCIENCE QUEST KZ</strong></main>
}

function AppRouter() {
  const auth = useAuth()
  const { status, profile } = useOnline()
  const { setMusicScene } = useMusic()
  const [path, setPath] = useState(window.location.pathname)
  const [linkAccount, setLinkAccount] = useState(false)

  useEffect(() => {
    let nextScene: MusicScene = 'menu'
    if (auth.phase === 'loading') nextScene = 'none'
    else if (auth.role === 'admin' && path !== '/game' && !path.startsWith('/game/')) nextScene = 'none'
    else if (path === '/game/map') nextScene = 'gameplay'
    else if (path.startsWith('/game/boss/')) nextScene = 'boss'
    else if (path.startsWith('/game/level/')) {
      const id = decodeURIComponent(path.slice('/game/level/'.length))
      nextScene = levelById[id]?.type === 'challenge' ? 'challenge' : 'quest'
    }
    setMusicScene(nextScene)
  }, [auth.phase, auth.role, path, setMusicScene])

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (next: string, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', next)
    setPath(next)
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    if (auth.phase === 'loading') return
    if (!auth.user) {
      if (!PUBLIC_PATHS.has(path)) navigate('/', true)
      return
    }
    if (auth.roleLoading || auth.needsPasswordSetup) return
    if (linkAccount && !auth.isAnonymous) {
      setLinkAccount(false)
      return
    }
    if (linkAccount) return
    if (auth.role === 'admin' && PUBLIC_PATHS.has(path)) {
      navigate('/admin', true)
      return
    }
    if (auth.role === 'admin' && path === '/profile/setup') {
      navigate('/admin', true)
      return
    }
    if (auth.role === 'student' && status === 'ready' && !profile && path !== '/profile/setup') {
      navigate('/profile/setup', true)
      return
    }
    if (auth.role === 'student' && status === 'ready' && profile && (PUBLIC_PATHS.has(path) || path === '/profile/setup')) navigate('/game', true)
  // Navigation follows authentication transitions; navigate is intentionally local.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.phase, auth.user?.id, auth.role, auth.roleLoading, auth.needsPasswordSetup, linkAccount, status, profile, path])

  if (auth.phase === 'loading' || (auth.session && (status === 'connecting' || auth.roleLoading))) {
    return <AppLoading />
  }

  if (!auth.user || auth.phase === 'guest' || auth.phase === 'error') {
    const publicPath = PUBLIC_PATHS.has(path) ? path : '/'
    if (publicPath === '/') return <PublicLandingPage onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />
    const initialView: AuthView = publicPath === '/register' ? 'register' : publicPath === '/forgot-password' ? 'forgot' : 'login'
    return <AuthPage initialView={initialView} onBack={() => navigate('/')} />
  }

  if (auth.needsPasswordSetup || linkAccount) {
    return <AuthPage onBack={auth.isAnonymous ? () => setLinkAccount(false) : undefined} />
  }

  if (auth.role === 'admin' && path !== '/game' && !path.startsWith('/game/')) {
    return <AdminRoute onGame={() => navigate('/game/map')}><AdminApp onGame={() => navigate('/game/map')} /></AdminRoute>
  }

  if (auth.role !== 'admin' && status === 'ready' && !profile) return <ProfileSetupPage />

  if (path.startsWith('/admin')) {
    return <AdminRoute onGame={() => navigate('/game/map')}><AdminApp onGame={() => navigate('/game/map')} /></AdminRoute>
  }

  return <GameApp path={path} navigate={navigate} onRegister={() => setLinkAccount(true)} onAdmin={() => navigate('/admin')} />
}

function routeFromPath(path: string): Route {
  if (path === '/profile') return 'profile'
  if (path === '/leaderboard') return 'leaderboard'
  if (path === '/achievements') return 'achievements'
  if (path === '/game/map') return 'map'
  if (path.startsWith('/game/level/')) return 'level'
  if (path.startsWith('/game/boss/')) return 'boss'
  return 'landing'
}

function GameApp({ path, navigate, onRegister, onAdmin }: { path: string; navigate: (next: string, replace?: boolean) => void; onRegister: () => void; onAdmin: () => void }) {
  const { progress } = useGame()
  const { role } = useAuth()
  const learning = useLearning()
  const adminMode = role === 'admin'
  const route = routeFromPath(path)
  const levelId = route === 'level' ? decodeURIComponent(path.slice('/game/level/'.length)) : ''
  const bossId = route === 'boss' ? decodeURIComponent(path.slice('/game/boss/'.length)) : ''
  const openLevel = (id: string) => { if (!adminMode) void logLevelStarted(id).catch(() => undefined); navigate(`/game/level/${encodeURIComponent(id)}`) }
  const openBoss = (id: string) => { if (!adminMode) void logLevelStarted(`boss:${id}`).catch(() => undefined); navigate(`/game/boss/${encodeURIComponent(id)}`) }
  const continueGame = () => progress.currentLevel.startsWith('boss:') ? openBoss(progress.currentLevel.split(':')[1]) : openLevel(progress.currentLevel)
  const goMap = () => navigate('/game/map')
  const goHome = () => navigate('/game')
  const goAchievements = () => navigate('/achievements')
  const goProfile = () => adminMode ? onAdmin() : navigate('/profile')
  const goLeaderboard = () => navigate('/leaderboard')
  const openAssignment = (type: LearningContentType | null, id: string | null) => {
    if (!type || !id) { goMap(); return }
    if (type === 'level') { openLevel(id); return }
    if (type === 'boss') { openBoss(id.replace(/^boss:/, '')); return }
    const candidate = levels.find((level) => (type === 'topic' ? level.topicId === id : level.sectionId === id) && !['locked', 'hidden'].includes(learning.getAccess('level', level.id)?.accessState ?? 'open'))
    if (candidate) openLevel(candidate.id); else goMap()
  }
  const requestedAccess = route === 'level' ? learning.getAccess('level', levelId) : route === 'boss' ? learning.getAccess('boss', `boss:${bossId}`) : null
  const blocked = !adminMode && learning.available && requestedAccess != null && ['locked', 'hidden'].includes(requestedAccess.accessState)

  return <div className="app-shell app-shell--with-mobile-nav">
    <span className="kazakh-glyph-sentinel" aria-hidden="true">Ә ә Ғ ғ Қ қ Ң ң Ө ө Ұ ұ Ү ү Һ һ І і</span>
    {adminMode && <div className="admin-game-banner"><span>🛡 <b>ADMIN MODE</b> · {progress.language === 'kk' ? 'Әкімші режимі · өзгерістер сақталмайды' : 'Режим администратора · изменения не сохраняются'}</span><button onClick={onAdmin}>⚙ {progress.language === 'kk' ? 'Әкімші панелі' : 'Админ-панель'}</button></div>}
    {route !== 'landing' && <AppHeader onHome={goHome} onMap={goMap} onLeaderboard={goLeaderboard} onAchievements={goAchievements} onProfile={goProfile} adminMode={adminMode} onAdmin={onAdmin} />}
    {route === 'landing' && <LandingPage onStart={goMap} onContinue={continueGame} onLeaderboard={goLeaderboard} onAchievements={goAchievements} onProfile={goProfile} onAssignment={openAssignment} />}
    {route === 'map' && <GameMap onOpenLevel={openLevel} onOpenBoss={openBoss} adminMode={adminMode} />}
    {route === 'level' && (blocked ? <LockedByTeacher onBack={goMap} language={progress.language} /> : <LevelPage levelId={levelId} onBack={goMap} onFinish={goMap} adminMode={adminMode} />)}
    {route === 'boss' && (blocked ? <LockedByTeacher onBack={goMap} language={progress.language} /> : <BossMission sectionId={bossId} onBack={goMap} onComplete={goMap} adminMode={adminMode} />)}
    {route === 'achievements' && <AchievementsPage onBack={goHome} />}
    {route === 'profile' && <ProfilePage onBack={goHome} onRegister={onRegister} onAdmin={onAdmin} />}
    {route === 'leaderboard' && <LeaderboardPage onBack={goHome} />}
    <MobileNavigation route={route} onHome={goHome} onMap={goMap} onLeaderboard={goLeaderboard} onAchievements={goAchievements} onProfile={goProfile} />
    {!adminMode && <AchievementModal />}
    {!adminMode && <RankMovementToast />}
  </div>
}

function LockedByTeacher({ onBack, language }: { onBack: () => void; language: 'kk' | 'ru' }) {
  return <main className="page-container locked-teacher"><span>🔒</span><h1>{language === 'kk' ? 'Қолжетімділік шектелген' : 'Доступ ограничен'}</h1><p>{language === 'kk' ? 'Бұл тапсырманы мұғалім әзірге жапты. Орындалған нәтижелеріңіз бен жұлдыздарыңыз сақталды.' : 'Преподаватель пока закрыл это задание. Ваши результаты и звёзды сохранены.'}</p><button className="primary-button" onClick={onBack}>{language === 'kk' ? 'Картаға оралу' : 'Вернуться на карту'}</button></main>
}
