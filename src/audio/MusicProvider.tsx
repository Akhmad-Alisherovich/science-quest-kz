import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type MusicScene = 'menu' | 'gameplay' | 'quest' | 'challenge' | 'boss' | 'none'

type MusicContextValue = {
  scene: MusicScene
  enabled: boolean
  volume: number
  setMusicScene: (scene: MusicScene) => void
  toggleMusic: () => void
  setMusicVolume: (volume: number) => void
}

const MUSIC_ENABLED_KEY = 'sciencequest_music_enabled'
const MUSIC_VOLUME_KEY = 'sciencequest_music_volume'
const LEGACY_PROGRESS_KEY = 'science-quest-kz-progress-v1'
const ACTIVE_ACCOUNT_KEY = 'science-quest-kz-active-account-v1'
const DEFAULT_VOLUME = 0.2
const CROSSFADE_MS = 600

// Boss currently shares the challenge track. Replacing this one entry with
// /audio/boss.mp3 is the only change needed when a dedicated track is added.
const TRACKS: Record<Exclude<MusicScene, 'none'>, string> = {
  menu: '/audio/main-menu.mp3',
  gameplay: '/audio/gameplay.mp3',
  quest: '/audio/quest.mp3',
  challenge: '/audio/challenge.mp3',
  boss: '/audio/challenge.mp3',
}

const MusicContext = createContext<MusicContextValue | null>(null)

const readStoredEnabled = () => {
  try {
    const explicit = localStorage.getItem(MUSIC_ENABLED_KEY)
    if (explicit != null) return explicit !== 'false'
    const account = localStorage.getItem(ACTIVE_ACCOUNT_KEY)
    const legacy = localStorage.getItem(account ? `${LEGACY_PROGRESS_KEY}:${account}` : LEGACY_PROGRESS_KEY)
    if (legacy) {
      const value = (JSON.parse(legacy) as { sound?: unknown }).sound
      if (typeof value === 'boolean') return value
    }
  } catch { /* Audio preferences must never block the app. */ }
  return true
}

const readStoredVolume = () => {
  try {
    const value = Number(localStorage.getItem(MUSIC_VOLUME_KEY))
    if (Number.isFinite(value) && value >= 0 && value <= 1) return value
  } catch { /* Use the safe default. */ }
  return DEFAULT_VOLUME
}

const clampVolume = (value: number) => Math.min(1, Math.max(0, value))

export function MusicProvider({ children }: { children: ReactNode }) {
  const [scene, setScene] = useState<MusicScene>('none')
  const [enabled, setEnabled] = useState(readStoredEnabled)
  const [volume, setVolume] = useState(readStoredVolume)
  const audioByScene = useRef(new Map<MusicScene, HTMLAudioElement>())
  const activeScene = useRef<MusicScene>('none')
  const desiredScene = useRef<MusicScene>('none')
  const enabledRef = useRef(enabled)
  const volumeRef = useRef(volume)
  const interacted = useRef(false)
  const animationFrame = useRef<number | null>(null)

  const stopAnimation = useCallback(() => {
    if (animationFrame.current != null) cancelAnimationFrame(animationFrame.current)
    animationFrame.current = null
  }, [])

  const getAudio = useCallback((nextScene: Exclude<MusicScene, 'none'>) => {
    const existing = audioByScene.current.get(nextScene)
    if (existing) return existing
    const audio = new Audio()
    audio.src = TRACKS[nextScene]
    audio.loop = true
    audio.preload = 'metadata'
    audio.volume = 0
    audio.addEventListener('error', () => {
      audio.pause()
      audio.volume = 0
    })
    audioByScene.current.set(nextScene, audio)
    return audio
  }, [])

  const animateVolumes = useCallback((from: HTMLAudioElement | null, to: HTMLAudioElement | null, onDone?: () => void) => {
    stopAnimation()
    const startedAt = performance.now()
    const fromVolume = from?.volume ?? 0
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / CROSSFADE_MS)
      if (from) from.volume = clampVolume(fromVolume * (1 - progress))
      if (to) to.volume = clampVolume(volumeRef.current * progress)
      if (progress < 1) animationFrame.current = requestAnimationFrame(step)
      else {
        animationFrame.current = null
        if (from && from !== to) {
          from.pause()
          from.volume = 0
        }
        onDone?.()
      }
    }
    animationFrame.current = requestAnimationFrame(step)
  }, [stopAnimation])

  const transitionTo = useCallback((nextScene: MusicScene) => {
    if (!enabledRef.current || !interacted.current || nextScene === 'none') {
      const previous = activeScene.current === 'none' ? null : audioByScene.current.get(activeScene.current) ?? null
      activeScene.current = 'none'
      if (previous) {
        for (const audio of audioByScene.current.values()) {
          if (audio !== previous) {
            audio.pause()
            audio.volume = 0
          }
        }
        animateVolumes(previous, null)
      }
      return
    }

    const target = getAudio(nextScene)
    if (activeScene.current === nextScene && !target.paused) {
      target.volume = volumeRef.current
      return
    }

    const previousScene = activeScene.current
    const previous = previousScene === 'none' ? null : audioByScene.current.get(previousScene) ?? null
    stopAnimation()
    for (const [trackScene, audio] of audioByScene.current) {
      if (trackScene !== previousScene && trackScene !== nextScene) {
        audio.pause()
        audio.volume = 0
      }
    }
    target.volume = 0
    activeScene.current = nextScene
    void target.play().then(() => animateVolumes(previous === target ? null : previous, target)).catch(() => {
      target.pause()
      target.volume = 0
      if (previous) {
        previous.pause()
        previous.volume = 0
      }
      activeScene.current = 'none'
    })
  }, [animateVolumes, getAudio, stopAnimation])

  useEffect(() => {
    desiredScene.current = scene
    enabledRef.current = enabled
    if (interacted.current) transitionTo(enabled ? scene : 'none')
  }, [enabled, scene, transitionTo])

  useEffect(() => {
    volumeRef.current = volume
    const current = activeScene.current === 'none' ? null : audioByScene.current.get(activeScene.current)
    if (current && !current.paused) current.volume = volume
  }, [volume])

  useEffect(() => {
    try {
      localStorage.setItem(MUSIC_ENABLED_KEY, String(enabled))
      localStorage.setItem(MUSIC_VOLUME_KEY, String(volume))
    } catch { /* Storage privacy modes must not affect navigation. */ }
  }, [enabled, volume])

  useEffect(() => {
    const unlock = () => {
      interacted.current = true
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('touchend', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      // Let the originating click finish first. This prevents a first click on
      // the mute button from briefly starting audio before it is turned off.
      window.setTimeout(() => {
        if (enabledRef.current) transitionTo(desiredScene.current)
      }, 0)
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('touchend', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('touchend', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
  }, [transitionTo])

  useEffect(() => () => {
    stopAnimation()
    for (const audio of audioByScene.current.values()) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    audioByScene.current.clear()
  }, [stopAnimation])

  const setMusicVolume = useCallback((nextVolume: number) => setVolume(clampVolume(nextVolume)), [])
  const value: MusicContextValue = {
    scene,
    enabled,
    volume,
    setMusicScene: setScene,
    toggleMusic: () => setEnabled((current) => !current),
    setMusicVolume,
  }

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
}

export function useMusic() {
  const context = useContext(MusicContext)
  if (!context) throw new Error('useMusic must be used inside MusicProvider')
  return context
}
