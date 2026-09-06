'use client'

import { CheckCircle2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BatchApprovalBarProps {
  selectedCount: number
  totalAmount: number
  isProcessing: boolean
  onApproveAll: () => void
  onCancel: () => void
}

export function BatchApprovalBar({
  selectedCount,
  totalAmount,
  isProcessing,
  onApproveAll,
  onCancel,
}: BatchApprovalBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border-2 border-primary/40 text-foreground shadow-2xl px-6 py-3.5 flex items-center gap-5 sm:gap-6 animate-in slide-in-from-bottom-6 duration-200 max-w-2xl w-[92%] sm:w-auto">
      <div className="text-xs sm:text-sm">
        <span className="font-mono font-bold text-primary mr-1 text-base">{selectedCount}</span>
        <span className="text-muted-foreground uppercase tracking-wider text-[11px] font-bold">Pesanan Terpilih</span>
      </div>

      <div className="h-6 w-px bg-border hidden sm:block" />

      <div className="text-xs sm:text-sm hidden sm:block">
        <span className="text-muted-foreground uppercase tracking-wider text-[11px] font-bold mr-1.5">Total:</span>
        <span className="font-serif font-bold text-primary text-base">
          Rp {totalAmount.toLocaleString('id-ID')}
        </span>
      </div>

      <div className="h-6 w-px bg-border" />

      <button
        onClick={onCancel}
        disabled={isProcessing}
        className="text-xs uppercase font-bold text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center gap-1"
      >
        <X size={14} />
        <span>Batal</span>
      </button>

      <Button
        onClick={onApproveAll}
        disabled={isProcessing}
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs uppercase font-bold tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20"
      >
        {isProcessing ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Memproses...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={14} />
            <span>Setujui Semua ({selectedCount})</span>
          </>
        )}
      </Button>
    </div>
  )
}
