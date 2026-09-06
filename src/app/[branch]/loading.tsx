import { Skeleton } from '@/components/ui/skeleton'

export default function BranchStorefrontLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-background animate-page-enter">
      {/* Editorial Grid Skeleton */}
      <div className="border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Sidebar */}
          <div className="col-span-1 md:col-span-3 border-r border-border p-8 md:p-10 space-y-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-44" />
            <div className="space-y-3 pt-6 border-t border-border">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>

          {/* Main Hero */}
          <div className="col-span-1 md:col-span-6 p-8 md:p-10 space-y-4 border-r border-border">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-14 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Supplier highlight */}
          <div className="col-span-1 md:col-span-3 p-8 md:p-10 bg-muted/40 space-y-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-10 py-10 space-y-10">
        {/* Category Pills Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24 flex-shrink-0" />
          ))}
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="aspect-[4/5] w-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
