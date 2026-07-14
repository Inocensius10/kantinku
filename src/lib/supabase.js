import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// The demo remains usable without credentials; configure .env for live data.
export const supabase = url && key ? createClient(url, key) : null
