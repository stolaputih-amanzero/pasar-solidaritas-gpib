"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { RevenueChart } from "@/components/admin/revenue-chart"
import { verifyPayment, updateOrderStatus } from "@/lib/supabase/api"
import { Order, OrderStatus, Branch } from "@/types/database"

export default function BranchAdminDashboardPage() {
  const params = useParams()
  const branchSlug = params?.branch as string
  const { user } = useAuth()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Stats state
  const [stats, setStats] = useState({
    dailyRevenue: 0,
    pendingPayments: 0,
    activeProducts: 0
  })

  // 1. Fetch branch
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

  const fetchData = useCallback(async () => {
    if (!branch) return

    // Fetch Orders of this branch
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!buyer_id(full_name, phone),
        pickup_slots(*),
        payment_proofs(*),
        order_items(*, products(*))
      `)
      .eq('branch_id', branch.id)
      .order('created_at', { ascending: false })

    if (ordersData) {
      setOrders(ordersData as Order[])

      // Calculate Stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      let dailyRev = 0
      let pendingCount = 0

      ordersData.forEach((order: any) => {
        if (order.status === 'pending_payment') {
          pendingCount++
        }
        const orderDate = new Date(order.created_at)
        const isPaid = ['confirmed', 'processing', 'ready_for_pickup', 'completed'].includes(order.status)
        if (orderDate >= today && isPaid) {
          dailyRev += Number(order.total_amount)
        }
      })

      // Fetch active products count for this branch
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branch.id)
        .eq('is_active', true)

      setStats({
        dailyRevenue: dailyRev,
        pendingPayments: pendingCount,
        activeProducts: productsCount || 0
      })
    }

    setLoading(false)
  }, [branch])

  useEffect(() => {
    if (!user || !branch) return
    fetchData()
  }, [user, branch, fetchData])

  // Handle Payment Verification using verify_payment() RPC
  const handleVerifyPayment = async (order: Order, proofId?: string) => {
    setActionLoading(order.id)
    try {
      if (proofId) {
        await verifyPayment({
          proofId: proofId,
          newStatus: 'approved'
        })
      } else {
        await updateOrderStatus({
          orderId: order.id,
          newStatus: 'confirmed'
        })
      }
      await fetchData()
    } catch (err: any) {
      alert(`Gagal memverifikasi: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle Order Lifecycle State Transitions using update_order_status() RPC
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setActionLoading(orderId)
    try {
      await updateOrderStatus({
        orderId: orderId,
        newStatus: newStatus
      })
      await fetchData()
    } catch (err: any) {
      alert(`Gagal memperbarui status: ${err.message}`)
    } finally {
      setActionLoading(null)
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

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-8 pb-4 border-b border-border">
        <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-muted-foreground">
          Admin Hub • {branch?.name || 'Cabang'}
        </span>
        <h1 className="text-4xl font-bold tracking-tighter mt-2">Manajemen Transaksi</h1>
      </div>

      {loading ? (
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="h-32 bg-secondary animate-pulse w-full"></div>
             <div className="h-32 bg-secondary animate-pulse w-full"></div>
             <div className="h-32 bg-secondary animate-pulse w-full"></div>
          </div>
          <div className="h-16 bg-secondary animate-pulse w-full mt-8"></div>
        </div>
      ) : (
        <>
          {/* Stats Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="border border-border p-6 bg-background flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Pendapatan Hari Ini</p>
              <p className="text-3xl font-serif font-bold text-primary">Rp {stats.dailyRevenue.toLocaleString('id-ID')}</p>
            </div>
            <div className="border border-border p-6 bg-background flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Menunggu Pembayaran</p>
              <p className="text-3xl font-bold">{stats.pendingPayments} <span className="text-sm font-normal text-muted-foreground">Pesanan</span></p>
            </div>
            <div className="border border-border p-6 bg-background flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Produk Aktif</p>
              <p className="text-3xl font-bold">{stats.activeProducts} <span className="text-sm font-normal text-muted-foreground">Item</span></p>
            </div>
          </div>

          {/* Revenue Chart Section */}
          <div className="border border-border mb-10 p-6 bg-background">
            <div className="mb-6 pb-4 border-b border-border">
              <h2 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Tren Pendapatan 7 Hari Terakhir ({branch?.name})
              </h2>
            </div>
            <RevenueChart orders={orders} />
          </div>

          {/* Orders Table */}
          <div className="border border-border overflow-x-auto">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-secondary/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground min-w-[700px]">
              <div className="col-span-3">ID / Tanggal / Jadwal</div>
              <div className="col-span-3">Pembeli</div>
              <div className="col-span-2">Total & Bukti</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Aksi Alur</div>
            </div>
            
            {orders.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                Belum ada pesanan terdaftar di cabang {branch?.name}.
              </div>
            ) : (
              orders.map((order) => {
                const pendingProof = order.payment_proofs?.find(p => p.status === 'pending')
                const isActing = actionLoading === order.id

                return (
                  <div key={order.id} className="grid grid-cols-12 gap-4 p-4 border-b border-border last:border-b-0 items-center text-sm min-w-[700px]">
                    <div className="col-span-3">
                      <p className="font-mono text-xs font-bold">{order.id.slice(0, 8)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                      {order.pickup_slots && (
                        <p className="text-[10px] text-primary font-medium mt-1">
                          Pickup: {new Date(order.pickup_slots.start_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <p className="font-bold">{order.buyer?.full_name || 'Pembeli'}</p>
                      <p className="text-xs text-muted-foreground">{order.buyer?.phone || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-serif font-bold text-primary">Rp {Number(order.total_amount).toLocaleString('id-ID')}</p>
                      {pendingProof ? (
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 border border-amber-500/20 inline-block mt-1">
                          Ada Bukti Bayar
                        </span>
                      ) : order.payment_proofs && order.payment_proofs.length > 0 ? (
                        <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground inline-block mt-1">
                          Bukti: {order.payment_proofs[0].status}
                        </span>
                      ) : null}
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 inline-block ${getStatusBadge(order.status)}`}>
                        {formatStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="col-span-2 text-right flex justify-end gap-2">
                      {order.status === 'pending_payment' && (
                        <Button 
                          size="sm" 
                          className="h-8 text-[10px] uppercase font-bold" 
                          disabled={isActing}
                          onClick={() => handleVerifyPayment(order, pendingProof?.id)}
                        >
                          {isActing ? '...' : 'Verifikasi Bayar'}
                        </Button>
                      )}
                      {order.status === 'confirmed' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[10px] uppercase font-bold" 
                          disabled={isActing}
                          onClick={() => handleUpdateStatus(order.id, 'processing')}
                        >
                          {isActing ? '...' : 'Mulai Proses'}
                        </Button>
                      )}
                      {order.status === 'processing' && (
                        <Button 
                          size="sm" 
                          className="h-8 text-[10px] uppercase font-bold" 
                          disabled={isActing}
                          onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}
                        >
                          {isActing ? '...' : 'Siap Diambil'}
                        </Button>
                      )}
                      {order.status === 'ready_for_pickup' && (
                        <Button 
                          size="sm" 
                          className="h-8 text-[10px] uppercase font-bold bg-emerald-600 hover:bg-emerald-700" 
                          disabled={isActing}
                          onClick={() => handleUpdateStatus(order.id, 'completed')}
                        >
                          {isActing ? '...' : 'Selesaikan'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
