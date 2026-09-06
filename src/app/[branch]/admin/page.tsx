"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { RevenueChart } from "@/components/admin/revenue-chart"
import { verifyPayment, updateOrderStatus, PAYMENT_PROOFS_BUCKET } from "@/lib/supabase/api"
import { Order, OrderStatus, Branch } from "@/types/database"
import { PaymentProofModal, OrderDetailsForModal } from "@/components/admin/payment-proof-modal"
import { RejectReasonDialog } from "@/components/admin/reject-reason-dialog"
import { BatchApprovalBar } from "@/components/admin/batch-approval-bar"
import { Eye, CheckSquare, Square } from "lucide-react"

export default function BranchAdminDashboardPage() {
  const params = useParams()
  const branchSlug = params?.branch as string
  const { user } = useAuth()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Selection & Modal States for UX Enhancement
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [modalOrder, setModalOrder] = useState<OrderDetailsForModal | null>(null)
  const [rejectingProofId, setRejectingProofId] = useState<string | null>(null)
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

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
        pickup_slots(*),
        payment_proofs(*),
        order_items(*, products(*))
      `)
      .eq('branch_id', branch.id)
      .order('created_at', { ascending: false })

    if (ordersData) {
      // Resolve buyer profiles
      const buyerIds = Array.from(new Set(ordersData.map((o: any) => o.buyer_id)))
      if (buyerIds.length > 0) {
        const { data: buyers } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', buyerIds)
        const buyerMap = Object.fromEntries((buyers || []).map((b) => [b.id, b]))
        ordersData.forEach((o: any) => {
          o.buyer = buyerMap[o.buyer_id] || { full_name: 'Pembeli Jemaat', phone: null }
        })
      }
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

  // Orders eligible for batch approval (status pending_payment AND has pending proof)
  const verifiableOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'pending_payment' && o.payment_proofs?.some((p) => p.status === 'pending')
    )
  }, [orders])

  // Computed total for selected orders
  const batchTotalAmount = useMemo(() => {
    return orders
      .filter((o) => selectedOrderIds.includes(o.id))
      .reduce((sum, o) => sum + Number(o.total_amount), 0)
  }, [orders, selectedOrderIds])

  // Toggle single order selection
  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    )
  }

  // Select/Deselect all verifiable orders
  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === verifiableOrders.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(verifiableOrders.map((o) => o.id))
    }
  }

  // Open side-by-side modal with signed URL
  const handleOpenProofModal = async (order: Order) => {
    const pendingProof = order.payment_proofs?.find((p) => p.status === 'pending')
    if (!pendingProof) return

    let proofUrl = ''
    try {
      const { data: signedData } = await supabase.storage
        .from(PAYMENT_PROOFS_BUCKET)
        .createSignedUrl(pendingProof.file_path, 3600)

      if (signedData?.signedUrl) {
        proofUrl = signedData.signedUrl
      } else {
        const { data: pubUrl } = supabase.storage
          .from(PAYMENT_PROOFS_BUCKET)
          .getPublicUrl(pendingProof.file_path)
        proofUrl = pubUrl.publicUrl
      }
    } catch (e) {
      console.error('Failed to get proof URL:', e)
    }

    const itemsFormatted = (order.order_items || []).map((item: any) => ({
      name: item.products?.name || 'Produk Jemaat',
      quantity: Number(item.quantity) || 1,
      price: Number(item.price_at_time) || 0,
    }))

    const pickupText = order.pickup_slots
      ? `${new Date(order.pickup_slots.start_at).toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })} (${new Date(order.pickup_slots.start_at).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })} - ${new Date(order.pickup_slots.end_at).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })})`
      : 'Pengambilan Mandiri di Cabang'

    setModalOrder({
      id: order.id,
      buyer_name: order.buyer?.full_name || 'Pembeli Jemaat',
      buyer_phone: order.buyer?.phone || '',
      pickup_slot: pickupText,
      items: itemsFormatted,
      total_amount: Number(order.total_amount),
      proof_url: proofUrl,
      proof_id: pendingProof.id,
    })
  }

  // Single Approve
  const handleApprovePayment = async (proofId: string) => {
    setActionLoading(proofId)
    try {
      await verifyPayment({
        proofId,
        newStatus: 'approved',
      })
      setSelectedOrderIds((prev) => prev.filter((id) => id !== modalOrder?.id))
      await fetchData()
    } catch (err: any) {
      alert(`Gagal memverifikasi: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Confirm Reject with Reason
  const handleConfirmReject = async (reason: string) => {
    if (!rejectingProofId) return
    setActionLoading(rejectingProofId)
    try {
      await verifyPayment({
        proofId: rejectingProofId,
        newStatus: 'rejected',
        rejectionReason: reason,
      })
      setModalOrder(null)
      setSelectedOrderIds((prev) => prev.filter((id) => id !== modalOrder?.id))
      await fetchData()
    } catch (err: any) {
      alert(`Gagal menolak bukti: ${err.message}`)
    } finally {
      setActionLoading(null)
      setRejectingProofId(null)
    }
  }

  // Batch Approve All Selected Orders
  const handleBatchApprove = async () => {
    if (selectedOrderIds.length === 0) return
    setIsBatchProcessing(true)

    const selectedOrdersData = orders.filter((o) => selectedOrderIds.includes(o.id))
    let successCount = 0
    let failCount = 0

    for (const ord of selectedOrdersData) {
      const pendingProof = ord.payment_proofs?.find((p) => p.status === 'pending')
      if (pendingProof) {
        try {
          await verifyPayment({
            proofId: pendingProof.id,
            newStatus: 'approved',
          })
          successCount++
        } catch (err) {
          console.error(`Gagal menyetujui order ${ord.id}:`, err)
          failCount++
        }
      }
    }

    setSelectedOrderIds([])
    setIsBatchProcessing(false)
    await fetchData()

    if (failCount > 0) {
      alert(`Persetujuan massal selesai: ${successCount} berhasil, ${failCount} gagal.`)
    }
  }

  // Handle Order Lifecycle State Transitions
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setActionLoading(orderId)
    try {
      await updateOrderStatus({
        orderId,
        newStatus,
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
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full pb-28">
      {/* Header */}
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
          <div className="border border-border overflow-x-auto bg-background">
            <div className="grid grid-cols-12 gap-3 p-4 border-b border-border bg-secondary/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground min-w-[760px] items-center">
              <div className="col-span-1 flex items-center gap-2">
                {verifiableOrders.length > 0 && (
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={selectedOrderIds.length === verifiableOrders.length ? "Batalkan Semua" : "Pilih Semua Menunggu Bayar"}
                  >
                    {selectedOrderIds.length === verifiableOrders.length && verifiableOrders.length > 0 ? (
                      <CheckSquare size={16} className="text-primary" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                )}
                <span>#</span>
              </div>
              <div className="col-span-3">ID / Tanggal / Jadwal</div>
              <div className="col-span-3">Pembeli</div>
              <div className="col-span-2">Total & Bukti</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Aksi Alur</div>
            </div>
            
            {orders.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                Belum ada pesanan terdaftar di cabang {branch?.name}.
              </div>
            ) : (
              orders.map((order) => {
                const pendingProof = order.payment_proofs?.find((p) => p.status === 'pending')
                const isSelected = selectedOrderIds.includes(order.id)
                const isActing = actionLoading === order.id

                return (
                  <div
                    key={order.id}
                    className={`grid grid-cols-12 gap-3 p-4 border-b border-border last:border-b-0 items-center text-sm min-w-[760px] transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                  >
                    {/* Checkbox Column */}
                    <div className="col-span-1 flex items-center">
                      {pendingProof ? (
                        <button
                          onClick={() => handleToggleSelectOrder(order.id)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          title="Pilih untuk persetujuan massal"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-primary" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono pl-1">-</span>
                      )}
                    </div>

                    {/* ID & Date */}
                    <div className="col-span-3">
                      <p className="font-mono text-xs font-bold">{order.id.slice(0, 8)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('id-ID')}
                      </p>
                      {order.pickup_slots && (
                        <p className="text-[10px] text-primary font-medium mt-1">
                          Pickup: {new Date(order.pickup_slots.start_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>

                    {/* Buyer */}
                    <div className="col-span-3">
                      <p className="font-bold">{order.buyer?.full_name || 'Pembeli'}</p>
                      <p className="text-xs text-muted-foreground">{order.buyer?.phone || '-'}</p>
                    </div>

                    {/* Total & Proof Badge */}
                    <div className="col-span-2">
                      <p className="font-serif font-bold text-primary">
                        Rp {Number(order.total_amount).toLocaleString('id-ID')}
                      </p>
                      {pendingProof ? (
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 border border-amber-500/20 inline-block mt-1">
                          Ada Bukti Bayar
                        </span>
                      ) : order.payment_proofs && order.payment_proofs.length > 0 ? (
                        <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground inline-block mt-1">
                          Bukti: {order.payment_proofs[0].status}
                          {order.payment_proofs[0].status === 'rejected' && ' (Ditolak)'}
                        </span>
                      ) : null}
                    </div>

                    {/* Status Badge */}
                    <div className="col-span-1">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 inline-block ${getStatusBadge(order.status)}`}>
                        {formatStatusLabel(order.status)}
                      </span>
                    </div>

                    {/* Actions Column */}
                    <div className="col-span-2 text-right flex justify-end gap-1.5 items-center">
                      {order.status === 'pending_payment' && pendingProof && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-8 text-[10px] uppercase font-bold border-primary text-primary hover:bg-primary/10 flex items-center gap-1" 
                          disabled={isActing}
                          onClick={() => handleOpenProofModal(order)}
                        >
                          <Eye size={13} />
                          <span>Tinjau</span>
                        </Button>
                      )}
                      {order.status === 'pending_payment' && !pendingProof && (
                        <span className="text-[10px] text-muted-foreground italic pr-2">
                          Menunggu Upload
                        </span>
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
                          variant="outline" 
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
                          className="h-8 text-[10px] uppercase font-bold bg-emerald-600 hover:bg-emerald-700 text-white" 
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

          {/* Modal 1: Side-by-Side Payment Proof Inspection */}
          <PaymentProofModal
            order={modalOrder}
            isOpen={!!modalOrder}
            onClose={() => setModalOrder(null)}
            onApprove={handleApprovePayment}
            onReject={(proofId) => setRejectingProofId(proofId)}
          />

          {/* Modal 2: Rejection Reason Selection Dialog */}
          <RejectReasonDialog
            isOpen={!!rejectingProofId}
            onClose={() => setRejectingProofId(null)}
            onConfirm={handleConfirmReject}
          />

          {/* Floating Toolbar: Batch Approval */}
          <BatchApprovalBar
            selectedCount={selectedOrderIds.length}
            totalAmount={batchTotalAmount}
            isProcessing={isBatchProcessing}
            onApproveAll={handleBatchApprove}
            onCancel={() => setSelectedOrderIds([])}
          />
        </>
      )}
    </div>
  )
}
