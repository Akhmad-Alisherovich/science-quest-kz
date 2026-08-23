import type { Language } from '../types/game'

const ranks = [
  { min: 0, kk: 'Жас зерттеуші', ru: 'Юный исследователь' },
  { min: 700, kk: 'Зерттеуші', ru: 'Исследователь' },
  { min: 2200, kk: 'Ғылыми сарапшы', ru: 'Научный эксперт' },
  { min: 5000, kk: 'Ғылым шебері', ru: 'Мастер науки' },
]

export const getRank = (xp: number, language: Language) => {
  const rank = [...ranks].reverse().find((item) => xp >= item.min) ?? ranks[0]
  return rank[language]
}

export const getRankProgress = (xp: number) => {
  const index = [...ranks].reverse().findIndex((item) => xp >= item.min)
  const currentIndex = ranks.length - 1 - index
  if (currentIndex >= ranks.length - 1) return 100
  const current = ranks[currentIndex].min
  const next = ranks[currentIndex + 1].min
  return Math.round(((xp - current) / (next - current)) * 100)
}
