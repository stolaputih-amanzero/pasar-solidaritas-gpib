import { createClient } from '@/lib/supabase/server'
import type { PromotionalBanner } from '@/types/database'

export async function getBanners(branchId?: string): Promise<PromotionalBanner[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('promotional_banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (branchId) {
    // Fetch global banner (branch_id IS NULL) + branch-specific banner
    query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`)
  } else {
    // Global landing page: fetch global banners
    query = query.is('branch_id', null)
  }

  const { data } = await query
  return data || []
}
