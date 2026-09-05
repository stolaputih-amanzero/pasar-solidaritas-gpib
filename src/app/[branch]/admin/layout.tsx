import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function BranchAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ branch: string }>
}) {
  const { branch: branchSlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/${branchSlug}/admin`)

  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, slug')
    .eq('slug', branchSlug)
    .single()

  if (!branch) notFound()

  // Check if Super Admin OR Branch Admin in branch_members
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
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
      
    if (membership?.role === 'branch_admin') {
      isAuthorized = true
    }
  }

  // 403 Forbidden Guard
  if (!isAuthorized) {
    return (
      <main className="p-12 text-center max-w-xl mx-auto my-20 border border-destructive/20 bg-destructive/5">
        <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-destructive">Akses Ditolak (403)</span>
        <h1 className="text-3xl font-bold tracking-tighter mt-2 mb-3">Otorisasi Tidak Memadai</h1>
        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          Akun Anda tidak memiliki izin sebagai <strong>Branch Admin</strong> untuk cabang {branch.name}.
          Hubungi koordinator gereja jika Anda adalah panitia yang ditugaskan.
        </p>
        <Link href={`/${branch.slug}`}>
          <Button variant="outline" className="text-xs uppercase tracking-widest font-bold">
            KEMBALI KE ETALASE CABANG
          </Button>
        </Link>
      </main>
    )
  }

  return (
    <div className="w-full">
      {children}
    </div>
  )
}
