import { useCallback } from 'react'
import { useGame } from '../store/GameStore'

export type SoundName = 'correct' | 'wrong' | 'xp' | 'achievement' | 'unlock'

export const useSound = () => {
  const { progress } = useGame()
  return useCallback((name: SoundName) => {
    if (!progress.sound) return
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return
    const ctx = new AudioContextCtor()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    const frequencies: Record<SoundName, number> = { correct: 660, wrong: 180, xp: 880, achievement: 1040, unlock: 760 }
    oscillator.frequency.value = frequencies[name]
    oscillator.type = name === 'wrong' ? 'sawtooth' : 'sine'
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)
    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.24)
    oscillator.addEventListener('ended', () => void ctx.close())
  }, [progress.sound])
}
