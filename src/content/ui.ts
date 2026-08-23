import { kk } from './kk/ui'
import { ru } from './ru/ui'
import type { Language } from '../types/game'

export type UiCopy = typeof kk
export const ui = (language: Language): UiCopy => language === 'kk' ? kk : ru
