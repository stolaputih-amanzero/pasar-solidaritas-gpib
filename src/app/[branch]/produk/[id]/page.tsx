"use client"

import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { useCart } from '@/components/providers/cart-provider'
import { Product } from '@/types/database'

export default function BranchProductDetailPage() {
  const params = useParams()
  const branchSlug = params?.branch as string
  const id = params?.id as string
  const { addItem } = useCart()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [branchName, setBranchName] = useState<string>('')

  useEffect(() => {
    if (!id || !branchSlug) return

    const fetchProduct = async () => {
      // 1. Fetch branch info
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name')
        .eq('slug', branchSlug)
        .single()

      if (branchData) {
        setBranchName(branchData.name)
      }

      // 2. Fetch product
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(id, name, slug),
          product_images(*)
        `)
        .eq('id', id)
        .single()
      
      if (data) {
        // Fetch supplier profile & user profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, phone')
          .eq('id', data.supplier_id)
          .maybeSingle()

        const { data: suppProf } = await supabase
          .from('supplier_profiles')
          .select('display_name, business_name, story, quote, cover_image_path')
          .eq('profile_id', data.supplier_id)
          .maybeSingle()

        const fullProduct = {
          ...data,
          profiles: prof || null,
          supplier_profiles: suppProf || null,
        }

        setProduct(fullProduct as Product)
        setActiveImage(data.cover_image_path || null)
      }
      setLoading(false)
    }
    
    fetchProduct()
  }, [id, branchSlug])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-16">
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground animate-pulse">Memuat Produk...</p>
      </div>
    )
  }

  if (!product) {
    notFound()
  }

  const supplierDisplayName = 
    product.supplier_profiles?.display_name || 
    product.profiles?.full_name || 
    'Supplier Jemaat'

  const supplierStory = product.supplier_profiles?.story || product.supplier_profiles?.quote

  const handleAddToCart = () => {
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      stock: product.stock,
      supplier_name: supplierDisplayName,
      image_url: product.cover_image_path || undefined
    })
    alert("Produk berhasil ditambahkan ke keranjang!")
  }

  const waText = encodeURIComponent(`Halo, saya tertarik dengan produk ${product.name} yang ada di Pasar Solidaritas ${branchName}. Apakah masih tersedia?`)

  return (
    <main className="grid grid-cols-1 md:grid-cols-12 gap-0 border-b border-border min-h-[calc(100vh-80px)]">
      {/* Gallery Section */}
      <section className="col-span-1 md:col-span-7 p-8 md:p-10 border-r border-border bg-secondary/10 flex flex-col">
        <div className="mb-4">
          <Link href={`/${branchSlug}/katalog`} className="text-[10px] uppercase font-bold tracking-widest text-primary hover:underline underline-offset-4">
            ← Kembali ke Katalog
          </Link>
        </div>

        <div className="aspect-[4/5] md:aspect-square relative w-full overflow-hidden bg-secondary">
          {activeImage ? (
            <Image
              src={activeImage}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-50">FOTO PRODUK</span>
            </div>
          )}
        </div>
        
        {product.product_images && product.product_images.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            {product.cover_image_path && (
              <div 
                className={`aspect-square relative bg-secondary cursor-pointer transition-opacity ${activeImage === product.cover_image_path ? 'border-2 border-primary' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setActiveImage(product.cover_image_path)}
              >
                <Image src={product.cover_image_path} alt="Cover" fill className="object-cover" />
              </div>
            )}
            {product.product_images.map((img) => (
              <div 
                key={img.id} 
                className={`aspect-square relative bg-secondary cursor-pointer transition-opacity ${activeImage === img.storage_path ? 'border-2 border-primary' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setActiveImage(img.storage_path)}
              >
                <Image src={img.storage_path} alt={img.alt_text || product.name} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Details Section */}
      <section className="col-span-1 md:col-span-5 p-8 md:p-10 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>{product.categories?.name || 'Hasil Bumi & Karya'}</span>
            <span>/</span>
            <span>{branchName || 'Cabang GPIB'}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter leading-tight">{product.name}</h1>
          <p className="text-2xl font-serif italic text-primary mt-4">Rp {Number(product.price).toLocaleString('id-ID')}</p>

          <div className="my-6 h-px bg-border w-full" />
          
          <div className="prose prose-sm dark:prose-invert max-w-none mb-8">
            <h3 className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground mb-3">Deskripsi Produk</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description || 'Tidak ada deskripsi rinci.'}</p>
            
            {supplierStory && (
              <>
                <h3 className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground mt-8 mb-3">Kisah di Balik Produk</h3>
                <blockquote className="border-l-2 border-primary pl-4 text-sm font-serif italic text-foreground/80">
                  "{supplierStory}"
                </blockquote>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-8 space-y-4 pt-6 border-t border-border">
          <div className="flex items-center justify-between p-4 border border-border bg-background">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden relative">
                {product.profiles?.avatar_url || product.supplier_profiles?.cover_image_path ? (
                  <Image 
                    src={product.supplier_profiles?.cover_image_path || product.profiles?.avatar_url || ''} 
                    alt={supplierDisplayName} 
                    fill 
                    className="object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                    {supplierDisplayName.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-tight">{supplierDisplayName}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  {product.supplier_profiles?.business_name || 'Mitra Jemaat'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-1">STOK: {product.stock}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button className="w-full" disabled={product.stock <= 0} onClick={handleAddToCart}>
              {product.stock > 0 ? 'TAMBAH KE KERANJANG' : 'STOK HABIS'}
            </Button>
            <a 
              href={`https://wa.me/?text=${waText}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button variant="outline" className="w-full">BAGIKAN KE WA</Button>
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
