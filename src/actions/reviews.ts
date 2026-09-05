'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReview(formData: FormData) {
  const supabase = await createClient()
  const product_id = formData.get('product_id') as string
  const branch_id = formData.get('branch_id') as string
  const rating = parseInt(formData.get('rating') as string, 10)
  const review_text = (formData.get('review_text') as string)?.trim() || null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Anda harus masuk (login) untuk memberikan ulasan produk.')

  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating harus berupa angka antara 1 sampai 5 bintang.')
  }

  const { error } = await supabase.from('product_reviews').insert({
    product_id,
    branch_id,
    buyer_id: user.id,
    rating,
    review_text,
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('Anda sudah pernah memberikan ulasan untuk produk ini.')
    }
    throw new Error(error.message || 'Gagal mengirimkan ulasan.')
  }
  
  revalidatePath('/', 'layout')
  return { success: true }
}
