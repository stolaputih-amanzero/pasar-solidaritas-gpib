'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const QUICK_REASONS = [
  'Nominal tidak sesuai dengan total tagihan',
  'Gambar bukti transfer buram atau terpotong',
  'Rekening tujuan transfer tidak sesuai',
  'Bukti transfer ganda atau fiktif',
  'Pesanan telah melewati batas waktu pembayaran',
]

interface RejectReasonDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function RejectReasonDialog({ isOpen, onClose, onConfirm }: RejectReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    const finalReason = customReason.trim() || selectedReason
    if (!finalReason) return
    setIsSubmitting(true)
    try {
      await onConfirm(finalReason)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-background text-foreground border border-border shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-destructive/10 text-destructive rounded-full">
              <AlertTriangle size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-destructive">Tindakan Admin</span>
              <h3 className="text-lg font-bold tracking-tight">Alasan Penolakan Bukti</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Pilih salah satu alasan standar atau tuliskan catatan spesifik. Pembeli akan melihat pesan ini pada halaman pesanan mereka.
        </p>

        {/* Quick Reasons Chips */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Alasan Cepat:
          </label>
          <div className="flex flex-col gap-1.5">
            {QUICK_REASONS.map((reason) => {
              const isSelected = selectedReason === reason && !customReason
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setSelectedReason(reason)
                    setCustomReason('')
                  }}
                  className={`px-3 py-2 text-xs text-left border transition-all ${
                    isSelected
                      ? 'bg-destructive/10 border-destructive text-destructive font-semibold'
                      : 'bg-card border-border text-foreground/80 hover:border-primary/50'
                  }`}
                >
                  {reason}
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom Reason Textarea */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Catatan Tambahan (Opsional):
          </label>
          <textarea
            value={customReason}
            onChange={(e) => {
              setCustomReason(e.target.value)
              setSelectedReason('')
            }}
            placeholder="Ketik catatan khusus untuk pembeli..."
            className="w-full p-3 border border-border bg-background focus:border-destructive focus:ring-1 focus:ring-destructive outline-none text-xs min-h-[70px] resize-none"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs uppercase font-bold">
            Batal
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleSubmit}
            disabled={(!selectedReason && !customReason.trim()) || isSubmitting}
            className="text-xs uppercase font-bold"
          >
            {isSubmitting ? 'Menolak...' : 'Konfirmasi Tolak Bukti'}
          </Button>
        </div>
      </div>
    </div>
  )
}
