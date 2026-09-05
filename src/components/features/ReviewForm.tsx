'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitReview } from '@/actions/reviews'

export function ReviewForm({
  productId,
  branchId,
  onSubmitted,
}: {
  productId: string
  branchId: string
  onSubmitted?: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      alert('Silakan pilih rating 1-5 bintang terlebih dahulu.')
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('product_id', productId)
      formData.append('branch_id', branchId)
      formData.append('rating', rating.toString())
      if (text) formData.append('review_text', text)
      
      await submitReview(formData)
      setSuccess(true)
      if (onSubmitted) onSubmitted()
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Gagal mengirim ulasan')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="p-6 bg-primary/10 border border-primary/30 rounded-none text-center">
        <p className="font-bold text-sm text-primary uppercase tracking-wider">
          Terima kasih! Ulasan Anda telah berhasil disimpan.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Ulasan Anda membantu jemaat lain menemukan produk terbaik karya sesama warga jemaat.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 border border-border bg-card">
      <div>
        <p className="editorial-kicker text-primary mb-1">Berikan Ulasan Jemaat</p>
        <h4 className="text-base font-bold text-foreground">Bagikan Pengalaman Anda</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Sebagai pembeli terverifikasi, ulasan Anda sangat berarti bagi kemandirian mitra jemaat produsen.
        </p>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-1 hover:scale-110 transition-transform focus:outline-none"
            aria-label={`Beri ${star} bintang`}
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= (hover || rating)
                  ? 'fill-amber-400 text-amber-500'
                  : 'text-muted-foreground/40'
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-mono font-bold text-muted-foreground ml-2">
          {rating > 0 ? `${rating} / 5 Bintang` : 'Pilih Bintang'}
        </span>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Catatan / Testimoni Produk
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ceritakan kualitas komoditas, rasa, kerapihan karya, atau pengalaman Anda..."
          rows={3}
          className="w-full p-3 border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
        />
      </div>

      <Button type="submit" disabled={rating === 0 || submitting} className="w-full sm:w-auto">
        {submitting ? 'Mengirim Ulasan...' : 'Kirim Ulasan Terverifikasi'}
      </Button>
    </form>
  )
}
