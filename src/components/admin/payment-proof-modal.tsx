'use client'

import { useState, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, ExternalLink, CheckCircle2, XCircle, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface OrderDetailsForModal {
  id: string
  buyer_name: string
  buyer_phone: string
  pickup_slot: string
  items: { name: string; quantity: number; price: number }[]
  total_amount: number
  proof_url: string
  proof_id: string
}

interface PaymentProofModalProps {
  order: OrderDetailsForModal | null
  isOpen: boolean
  onClose: () => void
  onApprove: (proofId: string) => Promise<void>
  onReject: (proofId: string) => void
}

export function PaymentProofModal({
  order,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: PaymentProofModalProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setZoom(1)
      setRotation(0)
      setCopied(false)
    }
  }, [isOpen])

  if (!isOpen || !order) return null

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await onApprove(order.proof_id)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsApproving(false)
    }
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cleanPhone = order.buyer_phone ? order.buyer_phone.replace(/\D/g, '') : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background text-foreground border border-border shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary">Inspeksi Transaksi</span>
            <h2 className="text-xl font-bold tracking-tight">Tinjau Bukti Pembayaran</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded"
            aria-label="Tutup modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content: Side by Side */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Transaction Breakdown */}
          <div className="w-full md:w-1/2 p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-border bg-card/50 space-y-5 text-sm">
            <div>
              <h3 className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">
                Informasi Pemesan & Jadwal
              </h3>
              <div className="space-y-2.5 bg-background p-4 border border-border">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Order ID:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    <span>{order.id.slice(0, 8)}...</span>
                    <button
                      onClick={handleCopyId}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Salin Full Order ID"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Pembeli:</span>
                  <span className="font-semibold">{order.buyer_name || 'Pembeli Jemaat'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Kontak WhatsApp:</span>
                  {cleanPhone ? (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-mono font-bold"
                    >
                      {order.buyer_phone} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Slot Pengambilan:</span>
                  <span className="font-medium text-primary">{order.pickup_slot}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3">
                Rincian Item Pesanan
              </h3>
              <div className="bg-background border border-border divide-y divide-border">
                {order.items.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">Tidak ada rincian item.</p>
                ) : (
                  order.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                      </div>
                      <span className="font-mono font-medium">
                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-baseline">
              <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Total Tagihan:</span>
              <span className="text-2xl font-serif font-bold text-primary">
                Rp {order.total_amount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Right Panel: Payment Slip Inspector */}
          <div className="w-full md:w-1/2 p-6 bg-secondary/30 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Image Toolbar */}
            <div className="absolute top-4 right-4 flex gap-1.5 z-10 bg-background/80 backdrop-blur-sm border border-border p-1">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="p-1.5 text-foreground/80 hover:text-foreground hover:bg-muted transition-colors rounded"
                title="Perbesar"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-1.5 text-foreground/80 hover:text-foreground hover:bg-muted transition-colors rounded"
                title="Perkecil"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 text-foreground/80 hover:text-foreground hover:bg-muted transition-colors rounded"
                title="Putar 90 Derajat"
              >
                <RotateCw size={16} />
              </button>
              {order.proof_url && (
                <a
                  href={order.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-foreground/80 hover:text-foreground hover:bg-muted transition-colors rounded"
                  title="Buka Gambar Asli di Tab Baru"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>

            {/* Proof Image Stage */}
            <div className="overflow-auto max-h-full max-w-full flex items-center justify-center p-4">
              {order.proof_url ? (
                <img
                  src={order.proof_url}
                  alt="Bukti Transfer"
                  className="max-h-[60vh] max-w-full object-contain border border-border shadow-md transition-transform duration-150"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              ) : (
                <div className="p-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  Bukti transfer tidak dapat dimuat atau belum tersedia.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-card flex justify-between items-center">
          <p className="text-[11px] text-muted-foreground">
            Pastikan nama pengirim dan nominal transfer persis sesuai tagihan.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onReject(order.proof_id)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs uppercase font-bold"
            >
              <XCircle size={15} className="mr-1.5" /> Tolak Bukti
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs uppercase font-bold"
            >
              <CheckCircle2 size={15} className="mr-1.5" />
              {isApproving ? 'Memproses...' : 'Setujui Pembayaran'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
