import { achievementById } from '../content/achievements'
import { supabase } from '../lib/supabase'
import type { AchievementCategory, AchievementRarity, AchievementState } from '../types/game'
import { requireAuthenticatedUser } from './leaderboardService'

type Row = Record<string, unknown>
const numberValue = (value: unknown) => Number(value ?? 0)

export async function fetchMyAchievements(): Promise<AchievementState[]> {
  if (!supabase) return []
  await requireAuthenticatedUser()
  const { data, error } = await supabase.rpc('get_my_achievements')
  if (error) throw error
  return ((data ?? []) as Row[]).map((row) => {
    const fallback = achievementById[String(row.code)]
    return {
      id: String(row.code),
      icon: String(row.icon ?? fallback?.icon ?? '🏆'),
      title: { kk: String(row.title_kk ?? fallback?.title.kk ?? ''), ru: String(row.title_ru ?? fallback?.title.ru ?? '') },
      description: { kk: String(row.description_kk ?? fallback?.description.kk ?? ''), ru: String(row.description_ru ?? fallback?.description.ru ?? '') },
      category: String(row.category ?? fallback?.category ?? 'mastery') as AchievementCategory,
      rarity: String(row.rarity ?? fallback?.rarity ?? 'COMMON') as AchievementRarity,
      hidden: Boolean(row.hidden),
      rewardXp: numberValue(row.reward_xp),
      rewardCrystals: numberValue(row.reward_crystals),
      rewardTitle: row.reward_title_kk && row.reward_title_ru ? { kk: String(row.reward_title_kk), ru: String(row.reward_title_ru) } : undefined,
      target: numberValue(row.target_value ?? fallback?.target ?? 1),
      current: row.current_value == null ? null : numberValue(row.current_value),
      unlocked: Boolean(row.unlocked),
      earnedAt: row.earned_at == null ? null : String(row.earned_at),
      selectedTitle: Boolean(row.selected_title),
    }
  })
}

export async function setMyProfileTitle(code: string | null): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  await requireAuthenticatedUser()
  const { error } = await supabase.rpc('set_my_profile_title', { p_code: code })
  if (error) throw error
}
