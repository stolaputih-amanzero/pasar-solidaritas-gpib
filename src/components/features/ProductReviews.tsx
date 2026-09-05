import { Star } from 'lucide-react'
import { ReviewForm } from './ReviewForm'
import type { ProductReview } from '@/types/database'

interface Props {
  productId: string
  branchId: string
  currentUserId?: string
  avgRating: number
  reviewCount: number
  reviews: (ProductReview & { profiles?: { full_name: string; avatar_url: string | null } | null })[]
  canReview: boolean
}

export function ProductReviews({
  productId,
  branchId,
  currentUserId,
  avgRating,
  reviewCount,
  reviews,
  canReview,
}: Props) {
  const alreadyReviewed = reviews.some((r) => r.buyer_id === currentUserId)

  return (
    <div className="mt-16 pt-10 border-t border-border space-y-8">
      <div>
        <p className="editorial-kicker text-primary mb-2">Social Proof & Testimoni</p>
        <h3 className="editorial-title-serif text-3xl md:text-4xl text-foreground">
          Ulasan Warga Jemaat
        </h3>
        
        {reviewCount > 0 ? (
          <div className="flex items-center gap-4 mt-4 p-4 border border-border bg-card inline-flex">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${
                    s <= Math.round(avgRating)
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <span className="text-3xl font-bold font-serif text-foreground">
              {avgRating.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              / 5.0 ({reviewCount} Ulasan)
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            Belum ada ulasan untuk produk ini. Jadilah pembeli pertama yang membagikan ulasan!
          </p>
        )}
      </div>

      {/* Review List */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((review) => {
            const reviewerName = review.profiles?.full_name || 'Warga Jemaat'
            return (
              <div key={review.id} className="p-5 border border-border bg-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {reviewerName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-xs uppercase tracking-tight text-foreground block">
                          {reviewerName}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest font-mono text-primary font-bold">
                          Verified Buyer
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= review.rating
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      "{review.review_text}"
                    </p>
                  )}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-4 pt-3 border-t border-border/50">
                  {new Date(review.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Verified Buyer Form */}
      {canReview && !alreadyReviewed && currentUserId && (
        <div className="mt-8">
          <ReviewForm productId={productId} branchId={branchId} />
        </div>
      )}
    </div>
  )
}
