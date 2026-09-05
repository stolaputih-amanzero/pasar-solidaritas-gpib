import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CsvImportForm } from './csv-import-form'

export default async function ImportProdukPage({
  params,
}: {
  params: Promise<{ branch: string }>
}) {
  const { branch: branchSlug } = await params
  const supabase = await createClient()

  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, slug')
    .eq('slug', branchSlug)
    .single()

  if (!branch) notFound()

  // Fetch active categories for slug matching
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Link
          href={`/${branchSlug}/supplier`}
          className="editorial-kicker text-primary hover:underline underline-offset-4"
        >
          ← Kembali ke Dasbor Mitra
        </Link>
      </div>

      <div className="pb-4 border-b border-border">
        <span className="editorial-kicker text-primary">Operasional Efisien</span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Impor Produk Massal (CSV)</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Tambahkan inventaris dalam jumlah banyak ke etalase {branch.name} sekaligus menggunakan berkas spreadsheet CSV.
        </p>
      </div>

      <CsvImportForm
        branchId={branch.id}
        branchSlug={branch.slug}
        categories={categories || []}
      />
    </div>
  )
}
