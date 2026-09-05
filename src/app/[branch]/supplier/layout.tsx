import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ReactNode } from 'react'
import { Store, PlusCircle, Package, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function BranchSupplierLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ branch: string }>
}) {
  const { branch: branchSlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/${branchSlug}/supplier`)

  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, slug')
    .eq('slug', branchSlug)
    .single()

  if (!branch) notFound()

  // Authorization check: Super Admin OR Supplier OR Branch Admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin, full_name')
    .eq('id', user.id)
    .single()

  let isAuthorized = profile?.is_super_admin === true

  if (!isAuthorized) {
    const { data: membership } = await supabase
      .from('branch_members')
      .select('role')
      .eq('branch_id', branch.id)
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (membership?.role === 'supplier' || membership?.role === 'branch_admin') {
      isAuthorized = true
    }
  }

  if (!isAuthorized) {
    return (
      <main className="p-12 text-center max-w-xl mx-auto my-20 border border-destructive/20 bg-destructive/5">
        <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-destructive">Akses Ditolak (403)</span>
        <h1 className="text-3xl font-bold tracking-tighter mt-2 mb-3">Bukan Mitra Supplier</h1>
        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          Anda tidak terdaftar sebagai Supplier aktif di cabang {branch.name}. Hubungi panitia cabang untuk mendaftarkan usaha karya jemaat Anda.
        </p>
        <Link href={`/${branch.slug}`}>
          <Button variant="outline" className="text-xs uppercase tracking-widest font-bold">
            Kembali ke Etalase {branch.name}
          </Button>
        </Link>
      </main>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href={`/${branch.slug}`} className="hover:text-primary flex items-center gap-1 font-bold uppercase tracking-wider">
              <ArrowLeft className="h-3 w-3" /> Etalase {branch.name}
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Supplier</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola katalog produk, stok ketersediaan, dan pesanan jemaat untuk {profile?.full_name || 'Anda'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/${branch.slug}/supplier`}>
            <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider font-bold">
              <Package className="mr-1.5 h-3.5 w-3.5" />
              Katalog Saya
            </Button>
          </Link>
          <Link href={`/${branch.slug}/supplier/produk/tambah`}>
            <Button size="sm" className="text-xs uppercase tracking-wider font-bold">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              Tambah Produk
            </Button>
          </Link>
          <Link href={`/${branch.slug}/supplier/pesanan`}>
            <Button variant="secondary" size="sm" className="text-xs uppercase tracking-wider font-bold">
              <Store className="mr-1.5 h-3.5 w-3.5" />
              Pesanan Masuk
            </Button>
          </Link>
        </div>
      </div>

      {children}
    </div>
  )
}
