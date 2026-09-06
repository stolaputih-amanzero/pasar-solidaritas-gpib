import { Skeleton } from '@/components/ui/skeleton'

export default function GlobalLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-background animate-page-enter">
      {/* Skeleton Navbar placeholder */}
      <div className="h-16 border-b border-border px-6 md:px-10 flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <div className="hidden md:flex gap-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Hero Header Skeleton */}
      <header className="border-b border-border py-16 md:py-20 px-6 md:px-10 max-w-7xl mx-auto w-full text-center flex flex-col items-center">
        <Skeleton className="h-5 w-56 mb-6" />
        <Skeleton className="h-14 md:h-20 w-3/4 max-w-2xl mb-4" />
        <Skeleton className="h-4 w-1/2 max-w-lg mb-2" />
        <Skeleton className="h-4 w-2/5 max-w-md" />
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-10 py-12 space-y-16">
        {/* Carousel Skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <Skeleton className="h-3 w-32 mb-2" />
              <Skeleton className="h-8 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
          <Skeleton className="w-full aspect-[16/9] md:aspect-[21/9] rounded-none" />
        </div>

        {/* Branch Cards Skeleton */}
        <div>
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 border border-border space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <div className="pt-4 border-t border-border flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
