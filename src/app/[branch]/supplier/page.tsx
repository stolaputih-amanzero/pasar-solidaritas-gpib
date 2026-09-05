"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Product, Branch } from "@/types/database"

export default function BranchSupplierProductsPage() {
  const params = useParams()
  const branchSlug = params?.branch as string
  const { user } = useAuth()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!branchSlug) return
    const fetchBranch = async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('slug', branchSlug)
        .single()
      if (data) setBranch(data)
    }
    fetchBranch()
  }, [branchSlug])

  useEffect(() => {
    if (!user || !branch) return

    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('branch_id', branch.id)
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setProducts(data as Product[])
      setLoading(false)
    }

    fetchProducts()
  }, [user, branch])

  return (
    <div>
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Katalog Produk Saya</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Daftar karya dan produk yang Anda pasarkan di {branch?.name}.</p>
        </div>
        <Link href={`/${branchSlug}/supplier/produk/tambah`}>
          <Button className="uppercase text-xs tracking-wider font-bold">TAMBAH PRODUK BARU</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-16 bg-secondary animate-pulse w-full"></div>
          <div className="h-16 bg-secondary animate-pulse w-full"></div>
          <div className="h-16 bg-secondary animate-pulse w-full"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="p-16 border border-border border-dashed text-center">
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold mb-4">Anda belum memiliki produk di cabang ini.</p>
          <Link href={`/${branchSlug}/supplier/produk/tambah`}>
            <Button variant="outline" className="uppercase text-xs tracking-wider">BUAT PRODUK PERTAMA</Button>
          </Link>
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-secondary/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground min-w-[650px]">
            <div className="col-span-4">Nama Produk</div>
            <div className="col-span-3">Kategori</div>
            <div className="col-span-2">Harga</div>
            <div className="col-span-1">Stok</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          {products.map((product) => (
            <div key={product.id} className="grid grid-cols-12 gap-4 p-4 border-b border-border last:border-b-0 items-center text-sm min-w-[650px]">
              <div className="col-span-4 font-medium truncate">{product.name}</div>
              <div className="col-span-3 text-xs text-muted-foreground">{product.categories?.name || '-'}</div>
              <div className="col-span-2 font-serif font-bold text-primary">Rp {Number(product.price).toLocaleString('id-ID')}</div>
              <div className="col-span-1 font-mono text-xs">{product.stock}</div>
              <div className="col-span-2 text-right">
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 ${product.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {product.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
