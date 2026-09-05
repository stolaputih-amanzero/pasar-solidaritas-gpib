import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function BranchStorefrontPage({
  params,
}: {
  params: Promise<{ branch: string }>
}) {
  const { branch: branchSlug } = await params
  const supabase = await createClient()

  // 1. Fetch branch
  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('slug', branchSlug)
    .single()

  if (!branch) notFound()

  // 2. Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // 3. Fetch products of this branch (latest published/active)
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      categories(name, slug)
    `)
    .eq('branch_id', branch.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6)

  // 4. Featured supplier
  const { data: featuredSupplier } = await supabase
    .from('supplier_profiles')
    .select('*')
    .eq('is_featured', true)
    .limit(1)
    .maybeSingle()

  const featuredList = products && products.length > 0 ? products.slice(0, 2) : []

  return (
    <main className="grid grid-cols-1 md:grid-cols-12 gap-0 border-b border-border">
      {/* Left Sidebar: Distribution Hub Info & Categories */}
      <aside className="col-span-1 md:col-span-3 border-r border-border p-8 md:p-10 flex flex-col justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mb-4">Pusat Distribusi</p>
          <h2 className="text-2xl font-bold tracking-tight mb-1">{branch.name}</h2>
          <p className="text-xs text-muted-foreground mb-8">{branch.address || 'Titik Distribusi Jemaat GPIB'}</p>
          
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4 border-b border-border pb-2">
            Kategori Produk
          </h3>
          <ul className="space-y-3">
            <li>
              <Link 
                href={`/${branch.slug}/katalog`}
                className="flex items-center justify-between text-sm group text-primary font-bold hover:translate-x-1 transition-transform"
              >
                <span>Semua Produk</span>
                <span className="text-[10px] font-mono opacity-50">→</span>
              </Link>
            </li>
            {categories && categories.map((cat) => (
              <li key={cat.id}>
                <Link 
                  href={`/${branch.slug}/katalog?kategori=${cat.slug}`}
                  className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground group cursor-pointer"
                >
                  <span className="group-hover:translate-x-1 transition-transform">{cat.name}</span>
                  <span className="text-[10px] font-mono opacity-50">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-6 bg-primary/5 border border-primary/20 rounded-none mt-10">
          <p className="text-[10px] uppercase font-bold tracking-widest mb-2 opacity-60 text-primary">Solidaritas Jemaat</p>
          <p className="text-2xl font-serif font-bold text-primary tracking-tight">Pemberdayaan</p>
          <p className="text-[10px] text-muted-foreground mt-1 italic">
            100% hasil penjualan dinikmati langsung oleh warga jemaat produsen.
          </p>
        </div>
      </aside>

      {/* Center Section: Editorial Curation */}
      <section className="col-span-1 md:col-span-6 p-8 md:p-10 flex flex-col justify-between border-r border-border">
        <div className="mb-8">
          <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-muted-foreground">Featured Selection</span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] mt-2 mb-4">
            Koleksi<br/>Terbaik<br/>
            <span className="italic font-serif font-medium text-primary">Pekan Ini</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-md">
            Karya otentik dan komoditas pilihan langsung dari tangan para pelaku UMKM dan petani warga jemaat {branch.name}.
          </p>
        </div>
        
        {featuredList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-6">
            {featuredList.map((prod) => (
              <Link href={`/${branch.slug}/produk/${prod.id}`} key={prod.id} className="group flex flex-col">
                <div className="aspect-[4/5] bg-secondary mb-4 relative overflow-hidden">
                  {prod.cover_image_path ? (
                    <Image
                      src={prod.cover_image_path}
                      alt={prod.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">PRODUK JEMAAT</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/5 dark:bg-white/5 group-hover:bg-transparent transition-colors"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <span className="bg-background text-foreground text-[10px] font-bold px-4 py-2 uppercase tracking-widest border border-border shadow-lg">
                      BELI SEKARANG
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{prod.name}</h3>
                <p className="text-xs text-muted-foreground">Rp {Number(prod.price).toLocaleString('id-ID')}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-10 border border-dashed border-border text-center my-8">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Belum ada produk unggulan di cabang ini.</p>
            <Link href={`/${branch.slug}/katalog`} className="mt-4 inline-block text-xs font-bold text-primary underline underline-offset-4">
              Lihat Katalog Lengkap →
            </Link>
          </div>
        )}

        <div className="pt-6 border-t border-border flex justify-between items-center">
          <Link href={`/${branch.slug}/katalog`} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline underline-offset-4">
            Jelajahi Seluruh Katalog Cabang →
          </Link>
          <span className="text-[10px] font-mono text-muted-foreground">{products?.length || 0} ITEMS TERSEDIA</span>
        </div>
      </section>

      {/* Right Column: Supplier Highlight & Storytelling */}
      <aside className="col-span-1 md:col-span-3 bg-foreground text-background p-8 md:p-10 flex flex-col justify-between">
        <div>
          <span className="text-[9px] uppercase font-bold tracking-[0.3em] opacity-60">Supplier Highlight</span>
          <div className="mt-8 mb-8">
            <div className="w-20 h-20 rounded-full border border-background/20 p-1 mb-4">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary to-background/10 flex items-center justify-center font-serif text-2xl text-background font-bold">
                {featuredSupplier?.display_name?.charAt(0) || 'M'}
              </div>
            </div>
            <h2 className="text-2xl font-serif italic mb-2 leading-tight text-background">
              {featuredSupplier?.display_name || 'Mama Martha Situmorang'}
            </h2>
            <p className="text-xs opacity-75 leading-relaxed font-light text-background">
              "{featuredSupplier?.story || featuredSupplier?.quote || 'Setiap helai karya kami membawa doa untuk keberlangsungan pendidikan anak-anak jemaat dan kemandirian ekonomi keluarga.'}"
            </p>
          </div>
          
          <div className="flex items-center gap-2 mb-10 text-background">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-background/10 rounded">Verified</span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 border border-background/20 rounded">Producer</span>
          </div>
        </div>
        
        <div className="mt-10 pt-8 border-t border-background/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase font-bold opacity-60">Petunjuk Distribusi</span>
            <span className="text-[10px] font-mono text-primary bg-primary/20 px-2 py-0.5 rounded">PICKUP ONLY</span>
          </div>
          <p className="text-[11px] opacity-70 leading-relaxed font-light text-background">
            Pemesanan dilakukan online, kemudian barang diambil pada jadwal yang dipilih di {branch.name}.
          </p>
        </div>
      </aside>
    </main>
  )
}
