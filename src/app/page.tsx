import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { Store, ArrowRight, Heart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function GlobalLandingPage() {
  const supabase = await createClient()

  // 1. Fetch all active branches
  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // 2. Check user session for personalized memberships
  const { data: { user } } = await supabase.auth.getUser()

  let myBranches: any[] = []
  let otherBranches = branches || []

  if (user && branches) {
    const { data: memberships } = await supabase
      .from('branch_members')
      .select('branch_id, role')
      .eq('profile_id', user.id)
      .eq('is_active', true)

    const myBranchIds = memberships?.map((m: any) => m.branch_id) || []
    myBranches = branches.filter((b) => myBranchIds.includes(b.id))
    otherBranches = branches.filter((b) => !myBranchIds.includes(b.id))
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Hero Header Section */}
      <header className="border-b border-border py-16 md:py-24 px-6 md:px-10 max-w-7xl mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.3em] mb-6">
          <Heart className="w-3 h-3 text-primary" />
          <span>Platform Pemberdayaan Ekonomi Jemaat</span>
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tighter max-w-4xl mx-auto leading-[0.95] mb-6">
          Pasar Solidaritas <br />
          <span className="italic font-serif font-medium text-primary">Keluarga Besar GPIB</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Menghubungkan karya otentik, hasil bumi, dan kerajinan tangan dari berbagai jemaat cabang untuk saling menopang dan menguatkan kemandirian ekonomi warga.
        </p>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-10 py-12 space-y-16">
        {/* Cabang Saya Section (if logged in & has memberships) */}
        {myBranches.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Afiliasi Akun</span>
                <h2 className="text-2xl font-bold tracking-tight mt-1 flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Cabang Saya
                </h2>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{myBranches.length} CABANG TERDAFTAR</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myBranches.map((branch) => (
                <Link
                  key={branch.id}
                  href={`/${branch.slug}`}
                  className="group block p-6 border-2 border-primary/40 bg-primary/5 hover:border-primary transition-all relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 bg-primary text-primary-foreground">
                      Terdaftar
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight uppercase group-hover:text-primary transition-colors">
                    {branch.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {branch.address || 'Pusat Distribusi Jemaat GPIB'}
                  </p>
                  <div className="mt-6 pt-4 border-t border-primary/20 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-primary">
                    <span>Masuk ke Etalase</span>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Semua Cabang Aktif Section */}
        <section>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Jelajahi Komunitas</span>
              <h2 className="text-2xl font-bold tracking-tight mt-1">
                {myBranches.length > 0 ? 'Cabang Jemaat Lainnya' : 'Pilih Titik Distribusi Cabang'}
              </h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{otherBranches.length} CABANG AKTIF</span>
          </div>

          {otherBranches.length === 0 ? (
            <div className="p-12 border border-dashed border-border text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Belum ada cabang lain yang aktif saat ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherBranches.map((branch) => (
                <Link
                  key={branch.id}
                  href={`/${branch.slug}`}
                  className="group block p-6 border border-border bg-card hover:border-primary hover:bg-secondary/20 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 border border-border text-muted-foreground">
                      Hub Terverifikasi
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight uppercase group-hover:text-primary transition-colors">
                    {branch.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {branch.address || 'Pusat Distribusi Komunitas'}
                  </p>
                  <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                    <span>Kunjungi Etalase</span>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="h-12 bg-background border-t border-border flex items-center justify-between px-6 md:px-10 text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
        <div>PASAR SOLIDARITAS © {new Date().getFullYear()} • GPIB MULTI-TENANT</div>
        <div className="hidden sm:flex gap-8">
          <span>PLATFORM: NEXT.JS + SUPABASE</span>
          <span>MODE: MULTI-TENANT_ACTIVE</span>
        </div>
      </footer>
    </div>
  )
}
