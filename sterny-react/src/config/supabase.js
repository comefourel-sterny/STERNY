import { createClient } from '@supabase/supabase-js'

// Singleton to avoid multiple GoTrueClient instances during HMR
export const supabaseClient = globalThis.__supabaseClient ||= createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
