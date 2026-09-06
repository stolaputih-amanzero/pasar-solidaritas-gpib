import { Skeleton } from '@/components/ui/skeleton'

export default function ProductDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-page-enter">
      {/* Breadcrumb Skeleton */}
      <div className="flex gap-2 items-center mb-8">
        <Skeleton className="h-3 w-16" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-3 w-24" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Product View Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image Frame */}
        <div className="space-y-4">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="flex gap-3">
            <Skeleton className="h-16 w-16" />
            <Skeleton className="h-16 w-16" />
            <Skeleton className="h-16 w-16" />
          </div>
        </div>

        {/* Details Column */}
        <div className="space-y-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-4/5" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-40" />
          <div className="space-y-2 pt-4 border-t border-border">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="pt-6 border-t border-border flex gap-4">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-28" />
          </div>
        </div>
      </div>
    </div>
  )
}
