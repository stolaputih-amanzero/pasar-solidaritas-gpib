"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Product, Branch } from "@/types/database"
import { SalesChart, SalesDataPoint } from "@/components/supplier/SalesChart"
import { TrendingUp, Package, ShoppingCart, Upload } from "lucide-react"

export default function BranchSupplierProductsPage() {
  const params = useParams()
  const branchSlug = params?.branch as string
  const { user } = useAuth()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [rawItems, setRawItems] = useState<any[]>([])
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

    const fetchData = async () => {
      setLoading(true)
      // 1. Fetch products
      const { data: prodData } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('branch_id', branch.id)
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false })

      if (prodData) {
        setProducts(prodData as Product[])

        const prodIds = prodData.map((p) => p.id)
        if (prodIds.length > 0) {
          // 2. Fetch order items for analytics
          const { data: itemData } = await supabase
            .from('order_items')
            .select(`
              quantity,
              price_at_time,
              product_id,
              orders (
                id,
                status,
                created_at
              )
            `)
            .in('product_id', prodIds)

          if (itemData) {
            setRawItems(itemData)
          }
        }
      }
      setLoading(false)
    }

    fetchData()
  }, [user, branch])

  // Compute analytics
  const analytics = useMemo(() => {
    const validStatus = ['confirmed', 'processing', 'ready_for_pickup', 'completed']
    const validItems = rawItems.filter((item: any) => {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
      return order && validStatus.includes(order.status)
    })

    let totalRevenue = 0
    let totalUnits = 0
    const orderIdSet = new Set<string>()
    const prodStats: Record<string, { name: string; revenue: number; units: number }> = {}

    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]))

    // Last 14 days
    const salesByDayMap: Record<string, { omset: number; unit: number }> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      salesByDayMap[key] = { omset: 0, unit: 0 }
    }

    validItems.forEach((item: any) => {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
      const qty = Number(item.quantity) || 0
      const price = Number(item.price_at_time) || 0
      const lineTotal = qty * price

      totalRevenue += lineTotal
      totalUnits += qty
      if (order?.id) orderIdSet.add(order.id)

      if (order?.created_at) {
        const dayKey = order.created_at.slice(0, 10)
        if (salesByDayMap[dayKey]) {
          salesByDayMap[dayKey].omset += lineTotal
          salesByDayMap[dayKey].unit += qty
        }
      }

      const pId = item.product_id
      const pName = productMap[pId] || 'Produk Jemaat'
      if (!prodStats[pId]) {
        prodStats[pId] = { name: pName, revenue: 0, units: 0 }
      }
      prodStats[pId].revenue += lineTotal
      prodStats[pId].units += qty
    })

    const salesByDay: SalesDataPoint[] = Object.entries(salesByDayMap).map(([date, val]) => ({
      date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      ...val,
    }))

    const topProducts = Object.values(prodStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      totalRevenue,
      totalUnits,
      totalOrders: orderIdSet.size,
      salesByDay,
      topProducts,
    }
  }, [rawItems, products])

  return (
    <div className="space-y-10">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Katalog & Analitik Mitra</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola karya jemaat dan pantau performa omset penjualan Anda di {branch?.name}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/${branchSlug}/supplier/produk/import`}>
            <Button variant="outline" className="uppercase text-xs tracking-wider font-bold">
              <Upload className="w-3.5 h-3.5 mr-2" />
              Impor CSV
            </Button>
          </Link>
          <Link href={`/${branchSlug}/supplier/produk/tambah`}>
            <Button className="uppercase text-xs tracking-wider font-bold">
              + Tambah Produk
            </Button>
          </Link>
        </div>
      </div>

      {/* Analytics Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="editorial-kicker text-primary mb-1">Performa Penjualan</p>
            <h3 className="text-lg font-bold tracking-tight">Tren Omset (14 Hari Terakhir)</h3>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            Data Terkonfirmasi
          </span>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Total Omset
            </div>
            <p className="text-2xl font-serif font-bold text-primary">
              Rp {analytics.totalRevenue.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Akumulasi transaksi selesai</p>
          </div>

          <div className="p-5 border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold mb-2">
              <Package className="h-4 w-4 text-primary" />
              Unit Terjual
            </div>
            <p className="text-2xl font-bold text-foreground">
              {analytics.totalUnits} <span className="text-xs font-normal text-muted-foreground">unit</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Volume komoditas terserap</p>
          </div>

          <div className="p-5 border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold mb-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Pesanan Terpenuhi
            </div>
            <p className="text-2xl font-bold text-foreground">
              {analytics.totalOrders} <span className="text-xs font-normal text-muted-foreground">pesanan</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Dukungan belanja warga jemaat</p>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="p-6 border border-border bg-card">
          <SalesChart data={analytics.salesByDay} />
        </div>

        {/* Top Selling Products */}
        {analytics.topProducts.length > 0 && (
          <div className="p-6 border border-border bg-card">
            <h4 className="editorial-kicker text-primary mb-3">Produk Terlaris</h4>
            <div className="space-y-3">
              {analytics.topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between pb-3 border-b border-border last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      {idx + 1}. {p.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {p.units} unit terjual
                    </p>
                  </div>
                  <span className="font-serif font-bold text-primary text-sm">
                    Rp {p.revenue.toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Products Table Section */}
      <section className="space-y-4 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <div>
            <p className="editorial-kicker text-primary mb-1">Inventaris Komoditas</p>
            <h3 className="text-lg font-bold tracking-tight">Daftar Produk Aktif</h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {products.length} SKU TERDAFTAR
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-14 bg-secondary animate-pulse w-full"></div>
            <div className="h-14 bg-secondary animate-pulse w-full"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 border border-border border-dashed text-center">
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold mb-4">
              Anda belum memiliki produk di cabang ini.
            </p>
            <Link href={`/${branchSlug}/supplier/produk/tambah`}>
              <Button variant="outline" className="uppercase text-xs tracking-wider">
                BUAT PRODUK PERTAMA
              </Button>
            </Link>
          </div>
        ) : (
          <div className="border border-border overflow-x-auto bg-card">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-secondary/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground min-w-[650px]">
              <div className="col-span-4">Nama Produk</div>
              <div className="col-span-3">Kategori</div>
              <div className="col-span-2">Harga</div>
              <div className="col-span-1">Stok</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            {products.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-12 gap-4 p-4 border-b border-border last:border-b-0 items-center text-sm min-w-[650px]"
              >
                <div className="col-span-4 font-medium truncate">{product.name}</div>
                <div className="col-span-3 text-xs text-muted-foreground">
                  {product.categories?.name || '-'}
                </div>
                <div className="col-span-2 font-serif font-bold text-primary">
                  Rp {Number(product.price).toLocaleString('id-ID')}
                </div>
                <div className="col-span-1 font-mono text-xs">{product.stock}</div>
                <div className="col-span-2 text-right">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 ${
                      product.is_active
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {product.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
