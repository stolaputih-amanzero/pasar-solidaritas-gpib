'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface BulkProductItem {
  name: string
  category_id: string | null
  description: string
  price: number
  stock: number
}

export async function bulkImportProducts(
  branchId: string,
  products: BulkProductItem[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Akses ditolak. Silakan login terlebih dahulu.')

  if (!products || products.length === 0) {
    throw new Error('Tidak ada data produk yang valid untuk diimpor.')
  }

  const toInsert = products.map((p) => ({
    branch_id: branchId,
    supplier_id: user.id,
    name: p.name,
    category_id: p.category_id,
    description: p.description,
    price: p.price,
    stock: p.stock,
    is_active: true,
  }))

  const { error } = await supabase.from('products').insert(toInsert)
  if (error) {
    throw new Error(error.message || 'Gagal menyimpan produk massal ke basis data.')
  }

  revalidatePath('/', 'layout')
  return { success: true, count: products.length }
}
