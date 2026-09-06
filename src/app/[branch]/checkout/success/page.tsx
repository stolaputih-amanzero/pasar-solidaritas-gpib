"use client"

import { useEffect, useState, use } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { submitPaymentProof, PAYMENT_PROOFS_BUCKET } from "@/lib/supabase/api"
import { Order, Branch } from "@/types/database"
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react"

export default function BranchCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = useParams()
  const branchSlug = params?.branch as string
  const resolvedParams = use(searchParams)
  const orderId = resolvedParams.order_id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  
  // Latest proof info
  const [latestProof, setLatestProof] = useState<any>(null)

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

  const fetchOrder = async () => {
    if (!orderId) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        pickup_slots(*),
        payment_proofs(*)
      `)
      .eq('id', orderId)
      .single()

    if (data) {
      setOrder(data as Order)
      if (data.payment_proofs && data.payment_proofs.length > 0) {
        // Sort to get the most recent proof
        const sortedProofs = [...data.payment_proofs].sort(
          (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        )
        setLatestProof(sortedProofs[0])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orderId) return

    setUploading(true)
    setUploadError("")

    try {
      // 1. Upload to Supabase Storage bucket 'payment-proofs'
      const fileExt = file.name.split('.').pop()
      const fileName = `${orderId}-${Date.now()}.${fileExt}`
      const filePath = `receipts/${fileName}`

      const { error: storageError } = await supabase.storage
        .from(PAYMENT_PROOFS_BUCKET)
        .upload(filePath, file)

      const recordedPath = storageError ? `receipts/${file.name}` : filePath

      // 2. Register proof using submit_payment_proof() stored procedure
      await submitPaymentProof({
        orderId: orderId,
        filePath: recordedPath,
      })

      // Refresh order state
      await fetchOrder()
    } catch (err: any) {
      console.error("Upload error:", err)
      setUploadError(err.message || "Gagal mengunggah bukti pembayaran.")
    } finally {
      setUploading(false)
    }
  }

  const isPendingVerification = latestProof?.status === 'pending'
  const isApproved = latestProof?.status === 'approved' || order?.status === 'confirmed'
  const isRejected = latestProof?.status === 'rejected'

  return (
    <main className="flex items-center justify-center p-6 my-10 min-h-[calc(100vh-200px)] animate-page-enter">
      <div className="max-w-lg w-full border border-border p-8 md:p-10 text-center bg-card shadow-sm">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        
        <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-muted-foreground">Berhasil Terdaftar</span>
        <h1 className="text-3xl font-bold tracking-tighter mt-2 mb-2 font-serif italic">Pesanan Siap Diproses</h1>
        <p className="text-xs text-muted-foreground mb-6">
          Terima kasih telah mendukung program pemberdayaan jemaat di {branch?.name || 'cabang kami'}.
        </p>
        
        <div className="p-4 bg-background border border-border my-6 text-left space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground uppercase text-[10px] tracking-widest">ID Pesanan</span>
            <span className="font-mono font-bold text-primary">{orderId ? orderId.slice(0, 8) : '-'}</span>
          </div>
          {order && (
            <>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Total Tagihan</span>
                <span className="font-bold text-foreground">Rp {Number(order.total_amount).toLocaleString('id-ID')}</span>
              </div>
              {order.pickup_slots && (
                <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Jadwal Ambil</span>
                  <span className="font-medium text-[11px]">
                    {new Date(order.pickup_slots.start_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 text-left mb-6 space-y-2">
          <p className="editorial-kicker text-primary">
            Instruksi Pembayaran • {branch?.name || 'Cabang GPIB'}
          </p>
          <p className="text-sm font-bold text-foreground font-sans">
            Transfer Kas Rekening Distribusi {branch?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Sertakan berita transfer: <span className="font-mono font-bold text-primary">ORD-{orderId ? orderId.slice(0, 8).toUpperCase() : '-'}</span>
          </p>
        </div>

        {/* Payment Proof Rejection Notice */}
        {isRejected && (
          <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 text-left flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-destructive uppercase tracking-wider">
                Bukti Pembayaran Ditolak
              </p>
              {latestProof.rejection_reason && (
                <p className="text-xs text-foreground/80 mt-1 font-medium">
                  <strong>Catatan Panitia:</strong> {latestProof.rejection_reason}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                Silakan unggah ulang bukti transfer yang sah dan jelas agar pesanan Anda dapat segera disetujui.
              </p>
            </div>
          </div>
        )}

        {/* Payment Proof Upload Section */}
        <div className="mb-6 p-4 border border-border bg-background text-left">
          <p className="text-xs font-bold uppercase tracking-wider mb-2">Status Bukti Transfer</p>
          
          {isApproved ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Pembayaran Anda telah diverifikasi oleh Admin Cabang.</span>
            </div>
          ) : isPendingVerification ? (
            <div className="p-3 bg-primary/10 border border-primary text-primary text-xs font-bold flex items-center gap-2">
              <span>✓ Bukti transfer telah diterima & sedang diverifikasi oleh panitia.</span>
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Upload bukti transfer ATM atau tangkapan layar m-banking Anda untuk diverifikasi panitia {branch?.name}.
              </p>
              {uploadError && (
                <p className="text-[10px] text-destructive font-bold mb-2">{uploadError}</p>
              )}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
              </label>
              {uploading && (
                <p className="text-[10px] text-primary mt-2 animate-pulse flex items-center gap-1.5">
                  <Upload size={12} className="animate-spin" />
                  <span>Mengunggah bukti transfer...</span>
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <Link href={`/${branchSlug}/katalog`} className="block">
            <Button variant="outline" className="w-full text-xs uppercase tracking-widest font-bold">
              KEMBALI KE KATALOG
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
