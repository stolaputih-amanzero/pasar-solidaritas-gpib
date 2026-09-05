import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function BranchStorefrontPage({
  params,
}: {
  params: Promise<{ branch: string }>
}) {
  const { branch: branchSlug } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // 1. Fetch branch data
  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('slug', branchSlug)
    .single()

  if (!branch) notFound()

  // 2. Fetch categories with active status
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // 3. Fetch active products for this branch
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      categories(name, slug)
    `)
    .eq('branch_id', branch.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // 4. Compute dynamic category product counts
  const categoryCounts: Record<string, number> = {}
  if (products) {
    products.forEach((p) => {
      if (p.category_id) {
        categoryCounts[p.category_id] = (categoryCounts[p.category_id] || 0) + 1
      }
    })
  }

  // 5. Fetch Featured Supplier Profile from Supabase
  // First attempt: check for is_featured in supplier_profiles
  const { data: featuredSupplier } = await supabase
    .from('supplier_profiles')
    .select('*')
    .eq('is_featured', true)
    .limit(1)
    .maybeSingle()

  // Fallback: If not featured specifically, query active supplier from branch_members
  let activeSupplier = featuredSupplier
  if (!activeSupplier) {
    const { data: branchSupplierMember } = await supabase
      .from('branch_members')
      .select('profile_id')
      .eq('branch_id', branch.id)
      .eq('role', 'supplier')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (branchSupplierMember) {
      const { data: suppData } = await supabase
        .from('supplier_profiles')
        .select('*')
        .eq('profile_id', branchSupplierMember.profile_id)
        .maybeSingle()

      if (suppData) {
        activeSupplier = suppData
      } else {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', branchSupplierMember.profile_id)
          .maybeSingle()

        if (profileData) {
          activeSupplier = {
            profile_id: profileData.id,
            display_name: profileData.full_name,
            business_name: 'Mitra Jemaat ' + branch.name,
            story: 'Menghadirkan karya dan komoditas terbaik untuk mempererat perekonomian jemaat.',
            quote: 'Saling menopang dan menguatkan kemandirian ekonomi keluarga.',
            cover_image_path: profileData.avatar_url,
            is_featured: false,
          }
        }
      }
    }
  }

  // 6. Compute Real Community Impact from Supabase Orders
  const { data: completedOrders } = await adminClient
    .from('orders')
    .select('total_amount, status')
    .eq('branch_id', branch.id)
    .in('status', ['confirmed', 'processing', 'ready_for_pickup', 'completed'])

  const totalImpact = (completedOrders || []).reduce(
    (acc, curr) => acc + (Number(curr.total_amount) || 0),
    0
  )

  const { count: supplierCount } = await supabase
    .from('branch_members')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branch.id)
    .eq('role', 'supplier')
    .eq('is_active', true)

  const featuredList = products && products.length > 0 ? products.slice(0, 2) : []

  return (
    <main className="editorial-grid">
      {/* Left Sidebar: Distribution Hub Info & Dynamic Categories */}
      <aside className="editorial-col-sidebar">
        <div>
          <p className="editorial-kicker mb-4">Pusat Distribusi</p>
          <h2 className="text-2xl font-bold tracking-tight mb-1">{branch.name}</h2>
          <p className="text-xs text-muted-foreground mb-8">
            {branch.address || 'Titik Distribusi Jemaat GPIB'}
          </p>

          <h3 className="editorial-kicker mb-4 border-b border-border pb-2">
            Kategori Produk
          </h3>
          <ul className="space-y-3">
            <li>
              <Link
                href={`/${branch.slug}/katalog`}
                className="flex items-center justify-between text-sm group text-primary font-bold hover:translate-x-1 transition-transform"
              >
                <span>Semua Produk</span>
                <span className="text-[10px] font-mono opacity-60">
                  {products?.length || 0}
                </span>
              </Link>
            </li>
            {categories &&
              categories.map((cat) => {
                const count = categoryCounts[cat.id] || 0
                return (
                  <li key={cat.id}>
                    <Link
                      href={`/${branch.slug}/katalog?kategori=${cat.slug}`}
                      className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground group cursor-pointer"
                    >
                      <span className="group-hover:translate-x-1 transition-transform">
                        {cat.name}
                      </span>
                      <span className="text-[10px] font-mono opacity-50">
                        {count > 0 ? `${count}` : '0'}
                      </span>
                    </Link>
                  </li>
                )
              })}
          </ul>
        </div>

        {/* Dynamic Community Impact Card */}
        <div className="editorial-box-highlight mt-10">
          <p className="editorial-kicker text-primary mb-2">Solidaritas Jemaat</p>
          <p className="text-2xl font-serif font-bold text-primary tracking-tight">
            {totalImpact > 0
              ? `Rp ${totalImpact.toLocaleString('id-ID')}`
              : `${supplierCount || 1} Mitra Jemaat`}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 italic">
            {totalImpact > 0
              ? 'Akumulasi perputaran ekonomi yang dinikmati langsung oleh warga jemaat produsen.'
              : '100% hasil penjualan dinikmati langsung oleh warga jemaat produsen.'}
          </p>
        </div>
      </aside>

      {/* Center Section: Editorial Curation */}
      <section className="editorial-col-main">
        <div className="mb-8">
          <span className="editorial-kicker">Featured Selection</span>
          <h1 className="editorial-title-hero mt-2 mb-4">
            Koleksi<br />Terbaik<br />
            <span className="editorial-title-serif">Pekan Ini</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            Karya otentik dan komoditas pilihan langsung dari tangan para pelaku UMKM dan petani warga jemaat {branch.name}.
          </p>
        </div>

        {featuredList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-6">
            {featuredList.map((prod) => (
              <Link
                href={`/${branch.slug}/produk/${prod.id}`}
                key={prod.id}
                className="editorial-card"
              >
                <div className="editorial-image-frame">
                  {prod.cover_image_path ? (
                    <Image
                      src={prod.cover_image_path}
                      alt={prod.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="editorial-kicker">PRODUK JEMAAT</span>
                    </div>
                  )}
                  <div className="editorial-image-overlay"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <span className="editorial-btn-action">
                      BELI SEKARANG
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">
                  {prod.name}
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Rp {Number(prod.price).toLocaleString('id-ID')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-10 border border-dashed border-border text-center my-8">
            <p className="editorial-kicker">
              Belum ada produk unggulan di cabang ini.
            </p>
            <Link
              href={`/${branch.slug}/katalog`}
              className="mt-4 inline-block text-xs font-bold text-primary underline underline-offset-4"
            >
              Lihat Katalog Lengkap →
            </Link>
          </div>
        )}

        <div className="pt-6 border-t border-border flex justify-between items-center">
          <Link
            href={`/${branch.slug}/katalog`}
            className="text-xs font-bold uppercase tracking-widest text-primary hover:underline underline-offset-4"
          >
            Jelajahi Seluruh Katalog Cabang →
          </Link>
          <span className="text-[10px] font-mono text-muted-foreground">
            {products?.length || 0} ITEMS TERSEDIA
          </span>
        </div>
      </section>

      {/* Right Column: Supplier Highlight & Storytelling */}
      <aside className="editorial-col-story">
        <div>
          <span className="editorial-kicker-light">Supplier Highlight</span>
          
          {activeSupplier ? (
            <div className="mt-8 mb-8">
              <div className="w-20 h-20 rounded-full border border-background/20 p-1 mb-4 overflow-hidden relative">
                {activeSupplier.cover_image_path ? (
                  <Image
                    src={activeSupplier.cover_image_path}
                    alt={activeSupplier.display_name}
                    fill
                    className="object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary to-background/10 flex items-center justify-center font-serif text-2xl text-background font-bold">
                    {activeSupplier.display_name.charAt(0)}
                  </div>
                )}
              </div>
              <h2 className="editorial-supplier-title">
                {activeSupplier.display_name}
              </h2>
              {activeSupplier.business_name && (
                <p className="text-[10px] uppercase font-bold tracking-wider text-background/60 mb-3">
                  {activeSupplier.business_name}
                </p>
              )}
              <p className="editorial-quote-light">
                "{activeSupplier.quote || activeSupplier.story || 'Setiap karya kami adalah persembahan karya untuk kemandirian jemaat.'}"
              </p>
            </div>
          ) : (
            <div className="mt-8 mb-8 p-6 border border-background/10 rounded">
              <p className="text-xs text-background/70 font-light">
                Belum ada profil supplier yang disorot untuk cabang ini.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mb-10 text-background">
            <span className="editorial-badge-verified">Verified</span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 border border-background/20 rounded">
              Producer
            </span>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-background/10">
          <div className="flex items-center justify-between mb-4">
            <span className="editorial-kicker-light">Petunjuk Distribusi</span>
            <span className="editorial-badge-pickup">PICKUP ONLY</span>
          </div>
          <p className="text-[11px] opacity-70 leading-relaxed font-light text-background">
            Pemesanan dilakukan online, kemudian barang diambil pada jadwal yang dipilih di titik distribusi {branch.name}.
          </p>
        </div>
      </aside>
    </main>
  )
}
