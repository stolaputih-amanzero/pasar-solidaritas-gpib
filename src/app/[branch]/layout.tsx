import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'

export default async function BranchLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ branch: string }>
}) {
  const { branch: branchSlug } = await params
  const supabase = await createClient()

  // Fetch branch information
  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('slug', branchSlug)
    .single()

  if (!branch || !branch.is_active) {
    notFound()
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar branchSlug={branch.slug} branchName={branch.name} />
      <div className="flex-1">
        {children}
      </div>
      <footer className="h-12 bg-background border-t border-border flex items-center justify-between px-6 md:px-10 text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
        <div>PASAR SOLIDARITAS © {new Date().getFullYear()} • GPIB MULTI-TENANT</div>
        <div className="hidden sm:flex gap-8">
          <span>CABANG: {branch.name.toUpperCase()}</span>
          <span>SLUG: {branch.slug}</span>
          <span>MODE: STABLE</span>
        </div>
      </footer>
    </div>
  )
}
