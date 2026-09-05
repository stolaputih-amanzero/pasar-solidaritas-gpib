import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function BranchKatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ branch: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { branch: branchSlug } = await params
  const queryParams = await searchParams
  const categorySlug = typeof queryParams.kategori === 'string' ? queryParams.kategori : undefined

  const supabase = await createClient()

  // 1. Fetch branch
  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('slug', branchSlug)
    .single()

  if (!branch) notFound()

  // 2. Fetch active categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // 3. Fetch products of this branch
  let query = supabase
    .from('products')
    .select(`
      *,
      categories(id, name, slug)
    `)
    .eq('branch_id', branch.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (categorySlug) {
    const activeCat = categories?.find(c => c.slug === categorySlug)
    if (activeCat) {
      query = query.eq('category_id', activeCat.id)
    }
  }

  const { data: products } = await query

  // Fetch supplier profiles for these products
  const supplierIds = products ? Array.from(new Set(products.map(p => p.supplier_id))) : []
  let supplierMap: Record<string, string> = {}

  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', supplierIds)
    
    if (suppliers) {
      suppliers.forEach((s: any) => {
        supplierMap[s.id] = s.full_name
      })
    }
  }
  const activeCategory = categories?.find(c => c.slug === categorySlug)

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-b border-border min-h-[calc(100vh-80px)]">
      {/* Filter Sidebar */}
      <aside className="col-span-1 md:col-span-3 border-r border-border p-8 md:p-10">
        <div className="sticky top-10">
          <div className="mb-2">
            <Link href={`/${branch.slug}`} className="text-[10px] uppercase font-bold tracking-widest text-primary hover:underline underline-offset-4">
              ← Kembali ke Etalase
            </Link>
          </div>
          <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mt-4 mb-8">
            Filter Katalog ({branch.name})
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-border pb-2">Kategori</h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href={`/${branch.slug}/katalog`} 
                    className={`text-sm block ${!categorySlug ? 'font-bold text-primary underline underline-offset-4' : 'text-muted-foreground hover:text-foreground transition-colors'}`}
                  >
                    Semua Produk
                  </Link>
                </li>
                {categories && categories.map((cat) => (
                  <li key={cat.id}>
                    <Link 
                      href={`/${branch.slug}/katalog?kategori=${cat.slug}`} 
                      className={`text-sm block ${categorySlug === cat.slug ? 'font-bold text-primary underline underline-offset-4' : 'text-muted-foreground hover:text-foreground transition-colors'}`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Products Grid */}
      <section className="col-span-1 md:col-span-9 p-8 md:p-10">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-muted-foreground">Katalog Jemaat</span>
            <h1 className="text-4xl font-bold tracking-tighter mt-2">
              {activeCategory ? activeCategory.name : 'Semua Produk'}
            </h1>
          </div>
          <span className="text-[10px] font-mono opacity-50">{products?.length || 0} ITEMS TERSEDIA</span>
        </div>

        {!products || products.length === 0 ? (
          <div className="p-16 border border-border border-dashed text-center">
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
              Belum ada produk aktif pada kategori ini di {branch.name}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => {
              const supplierName = supplierMap[product.supplier_id] || 'Supplier Jemaat'
              return (
                <Link href={`/${branch.slug}/produk/${product.id}`} key={product.id} className="group flex flex-col cursor-pointer">
                  <div className="aspect-[4/5] bg-secondary mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/5 dark:bg-white/5 group-hover:bg-transparent transition-colors z-10"></div>
                    {product.cover_image_path ? (
                      <Image 
                        src={product.cover_image_path} 
                        alt={product.name} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1/2 h-1/2 bg-muted rotate-2 opacity-50"></div>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <span className="bg-background text-foreground text-[10px] font-bold px-4 py-2 uppercase tracking-widest border border-border shadow-lg">
                        Lihat Detail
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{product.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-muted-foreground truncate">{supplierName}</p>
                    <p className="text-xs font-bold text-primary">Rp {Number(product.price).toLocaleString('id-ID')}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
