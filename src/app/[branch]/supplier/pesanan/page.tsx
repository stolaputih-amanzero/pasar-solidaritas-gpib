"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { OrderStatus, Branch } from "@/types/database"

export default function BranchSupplierOrdersPage() {
  const params = useParams()
  const branchSlug = params?.branch as string
  const { user } = useAuth()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [orders, setOrders] = useState<any[]>([])
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

    const fetchOrders = async () => {
      // Find orders in this branch containing this supplier's products
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(*)),
          buyer:profiles!buyer_id(full_name, phone),
          pickup_slots(*)
        `)
        .eq('branch_id', branch.id)
        .order('created_at', { ascending: false })

      if (data) {
        const formattedOrders = data.map((order: any) => ({
          ...order,
          order_items: order.order_items?.filter((item: any) => item.products?.supplier_id === user.id) || []
        })).filter((order: any) => order.order_items.length > 0)
        
        setOrders(formattedOrders)
      }
      setLoading(false)
    }

    fetchOrders()
  }, [user, branch])

  const formatStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending_payment': return 'Menunggu Bayar'
      case 'confirmed': return 'Terverifikasi'
      case 'processing': return 'Diproses'
      case 'ready_for_pickup': return 'Siap Diambil'
      case 'completed': return 'Selesai'
      case 'cancelled': return 'Dibatalkan'
      default: return status
    }
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-primary/20 text-primary'
      case 'ready_for_pickup':
        return 'bg-primary text-primary-foreground'
      case 'processing':
        return 'bg-blue-600/10 text-blue-600 border border-blue-600/20'
      case 'confirmed':
        return 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/20'
      case 'cancelled':
        return 'bg-destructive/10 text-destructive'
      case 'pending_payment':
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div>
      <div className="mb-8 pb-4 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight">Pesanan Masuk ({branch?.name})</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Pantau pesanan jemaat yang memuat produk hasil karya Anda.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-secondary animate-pulse w-full"></div>
          <div className="h-24 bg-secondary animate-pulse w-full"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 border border-border border-dashed text-center">
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
            Belum ada pesanan masuk untuk produk Anda di cabang ini.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const supplierTotal = order.order_items.reduce((sum: number, item: any) => sum + (Number(item.price_at_time) * item.quantity), 0)
            
            return (
              <div key={order.id} className="border border-border">
                <div className="p-4 bg-secondary/30 border-b border-border flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground">ID: {order.id.slice(0, 8)}</span>
                    <p className="font-bold text-sm mt-1">{order.buyer?.full_name || 'Pembeli'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                    {order.pickup_slots && (
                      <p className="text-[10px] text-primary font-medium mt-1">
                        Jadwal Ambil: {new Date(order.pickup_slots.start_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 inline-block ${getStatusBadge(order.status)}`}>
                      {formatStatusLabel(order.status)}
                    </span>
                    <p className="font-bold font-serif text-primary mt-2">Rp {supplierTotal.toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <div className="p-4 bg-background">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-muted-foreground text-left border-b border-border">
                        <th className="pb-2 font-normal">Produk</th>
                        <th className="pb-2 font-normal">Qty</th>
                        <th className="pb-2 font-normal text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.order_items.map((item: any) => (
                        <tr key={item.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 font-medium">{item.products?.name}</td>
                          <td className="py-3 font-mono text-muted-foreground">{item.quantity}</td>
                          <td className="py-3 text-right font-mono">Rp {(Number(item.price_at_time) * item.quantity).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
