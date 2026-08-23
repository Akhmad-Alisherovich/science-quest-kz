import type { GameLevel, GameType, LocalizedText } from '../types/game'
import { topics } from './topics'

const titles: Record<number, LocalizedText> = {
  1: { kk: 'Негізгі ұғымдар', ru: 'Ключевые понятия' },
  2: { kk: 'Байланыстарды қалпына келтір', ru: 'Восстанови связи' },
  3: { kk: 'Зертхана және деректер', ru: 'Лаборатория и данные' },
  4: { kk: 'Ғылыми сынақ', ru: 'Science Challenge' },
}

const instructions: Record<number, LocalizedText> = {
  1: { kk: 'Терминдерді конспектідегі ғылыми анықтамалармен сәйкестендір.', ru: 'Соедини термины с научными определениями из конспекта.' },
  2: { kk: 'Нысандарды жікте немесе үдеріс кезеңдерін дұрыс ретке келтір.', ru: 'Классифицируй объекты или восстанови порядок этапов процесса.' },
  3: { kk: 'Параметрді өзгерт, үлгіні бақыла және деректер бойынша қорытынды жаса.', ru: 'Измени параметр, исследуй модель и сделай вывод по данным.' },
  4: { kk: 'Бірнеше ғылыми байланысты қолданып, жаңа жағдайды талда.', ru: 'Проанализируй новую ситуацию, объединив несколько научных связей.' },
}

export const levels: GameLevel[] = topics.flatMap((topic, topicIndex) => {
  const secondType: GameType = topicIndex % 2 === 0 ? 'classification' : 'sequence'
  return [
    { id: `${topic.id}-know`, topicId: topic.id, sectionId: topic.sectionId, difficulty: 1, type: 'matching', title: titles[1], instruction: instructions[1], xp: 40 },
    { id: `${topic.id}-understand`, topicId: topic.id, sectionId: topic.sectionId, difficulty: 2, type: secondType, title: titles[2], instruction: instructions[2], xp: 55 },
    { id: `${topic.id}-apply`, topicId: topic.id, sectionId: topic.sectionId, difficulty: 3, type: topic.lab.mode, title: titles[3], instruction: instructions[3], xp: 70 },
    { id: `${topic.id}-challenge`, topicId: topic.id, sectionId: topic.sectionId, difficulty: 4, type: 'challenge', title: titles[4], instruction: instructions[4], xp: 100 },
  ]
})

export const levelById = Object.fromEntries(levels.map((level) => [level.id, level]))
export const topicLevels = (topicId: string) => levels.filter((level) => level.topicId === topicId)
