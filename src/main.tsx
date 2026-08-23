import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { GameProvider } from './store/GameStore'
import { OnlineProvider } from './store/OnlineStore'
import { AuthProvider } from './store/AuthStore'
import { LearningProvider } from './store/LearningStore'
import { MusicProvider } from './audio/MusicProvider'
import './styles.css'
import './typography.css'
import './responsive.css'
import './leaderboard.css'
import './auth.css'
import './admin.css'
import './public-landing.css'
import './home-dashboard.css'
import './achievement-system.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <MusicProvider><AuthProvider><OnlineProvider><LearningProvider><App /></LearningProvider></OnlineProvider></AuthProvider></MusicProvider>
    </GameProvider>
  </StrictMode>,
)
