import { supabase } from '../lib/supabase'

export async function getMenus(loketId) {
  if (!supabase) return []
  let query = supabase.from('menus').select('*, menu_categories(name), lokets(name)').eq('is_available', true)
  if (loketId) query = query.eq('loket_id', loketId)
  const { data, error } = await query.order('name')
  if (error) throw error
  return data
}
