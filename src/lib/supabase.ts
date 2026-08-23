import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim()

export const isLeaderboardConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase: SupabaseClient | null = isLeaderboardConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'x-application-name': 'science-quest-kz' } },
    })
  : null
