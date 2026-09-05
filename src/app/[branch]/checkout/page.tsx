"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { useCart } from "@/components/providers/cart-provider"
import { supabase } from "@/lib/supabase/client"
import { checkoutOrder, ensureBranchMember } from "@/lib/supabase/api"
import { PickupSlot, Branch } from "@/types/database"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

const checkoutSchema = z.object({
  pickup_slot_id: z.string().min(1, "Silakan pilih jadwal pengambilan barang"),
})

export default function BranchCheckoutPage() {
  const params = useParams()
  const branchSlug = params?.branch as string
  const { user } = useAuth()
  const { items, totalPrice, clearCart } = useCart()
  const router = useRouter()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([])
  const [fetchingSlots, setFetchingSlots] = useState(true)

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      pickup_slot_id: ""
    }
  })

  const selectedSlotId = watch("pickup_slot_id")

  // 1. Fetch branch data
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

  // 2. Fetch available pickup slots for this branch
  useEffect(() => {
    if (!branch) return

    const fetchSlots = async () => {
      setFetchingSlots(true)
      const now = new Date().toISOString()
      
      const { data } = await supabase
        .from('pickup_slots')
        .select('*')
        .eq('branch_id', branch.id)
        .gt('start_at', now)
        .order('start_at', { ascending: true })

      if (data && data.length > 0) {
        setPickupSlots(data)
        setValue("pickup_slot_id", data[0].id)
      } else {
        // Fallback for demo/all slots
        const { data: allSlots } = await supabase
          .from('pickup_slots')
          .select('*')
          .eq('branch_id', branch.id)
          .order('start_at', { ascending: true })
          
        if (allSlots && allSlots.length > 0) {
          setPickupSlots(allSlots)
          setValue("pickup_slot_id", allSlots[0].id)
        }
      }
      setFetchingSlots(false)
    }

    fetchSlots()
  }, [branch, setValue])

  // Prevent accessing checkout if cart is empty
  if (items.length === 0) {
    if (typeof window !== 'undefined') router.push(`/${branchSlug}/cart`)
    return null
  }

  const onSubmit = async (data: z.infer<typeof checkoutSchema>) => {
    if (!user) {
      router.push(`/login?redirect=/${branchSlug}/checkout`)
      return
    }

    if (!branch) return

    setLoading(true)
    setError("")

    try {
      // 1. Ensure user is registered as a buyer in this branch
      await ensureBranchMember(branch.id, 'buyer')

      // 2. Execute atomic checkout transaction via stored procedure checkout_order()
      const orderId = await checkoutOrder({
        branchId: branch.id,
        pickupSlotId: data.pickup_slot_id,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      })

      // 3. Clear cart and redirect to order success
      clearCart()
      router.push(`/${branchSlug}/checkout/success?order_id=${orderId}`)
    } catch (err: any) {
      console.error("Checkout error:", err)
      setError(err.message || "Terjadi kendala saat memproses pesanan dengan basis data.")
      setLoading(false)
    }
  }

  const formatSlotTime = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const dateStr = startDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    const timeStart = startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    const timeEnd = endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    return `${dateStr} (${timeStart} - ${timeEnd} WIB)`
  }

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto w-full min-h-[calc(100vh-140px)]">
      <div className="mb-10 border-b border-border pb-6">
        <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-muted-foreground">Checkout • {branch?.name}</span>
        <h1 className="text-4xl font-bold tracking-tighter mt-2">Jadwal Pengambilan</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/20 bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="col-span-1 md:col-span-7">
          <Card className="border-border">
            <CardContent className="p-6">
              {!user && (
                <div className="mb-8 p-4 bg-secondary/30 border border-border flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Anda belum login</p>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/login?redirect=/${branchSlug}/checkout`)}>LOGIN SEKARANG</Button>
                </div>
              )}
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wider font-bold">
                    Pilih Slot Waktu Pickup ({branch?.name || 'Hub Distribusi'})
                  </Label>
                  
                  {fetchingSlots ? (
                    <div className="p-6 border border-border bg-secondary/20 animate-pulse text-xs text-muted-foreground">
                      Memeriksa ketersediaan jadwal...
                    </div>
                  ) : pickupSlots.length === 0 ? (
                    <div className="p-6 border border-dashed border-border text-center">
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Belum Ada Slot Pickup Tersedia</p>
                      <p className="text-[10px] text-muted-foreground">Panitia cabang sedang menyiapkan slot waktu pengambilan baru.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pickupSlots.map((slot) => {
                        const isSelected = selectedSlotId === slot.id
                        return (
                          <div
                            key={slot.id}
                            onClick={() => setValue("pickup_slot_id", slot.id)}
                            className={`p-4 border cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/30'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold uppercase tracking-tight">{formatSlotTime(slot.start_at, slot.end_at)}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">Kapasitas Slot: {slot.capacity} pesanan</p>
                            </div>
                            <input 
                              type="radio" 
                              value={slot.id} 
                              checked={isSelected} 
                              {...register("pickup_slot_id")} 
                              className="accent-primary" 
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {errors.pickup_slot_id && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.pickup_slot_id.message}</p>}
                </div>

                <div className="p-4 bg-secondary/20 border border-border text-xs space-y-1">
                  <p className="font-bold text-foreground uppercase tracking-widest text-[10px]">Ketentuan Pengambilan:</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Barang diambil langsung di {branch?.name} ({branch?.address || 'titik distribusi gereja'}) setelah pembayaran Anda diverifikasi oleh Panitia Cabang. Harap membawa bukti pesanan digital Anda.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 uppercase tracking-widest font-bold" 
                  disabled={loading || pickupSlots.length === 0}
                >
                  {loading ? "MEMPROSES PESANAN..." : "KONFIRMASI & BUAT PESANAN"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 md:col-span-5">
          <div className="bg-secondary/20 border border-border p-6 sticky top-10">
            <h2 className="text-[10px] uppercase font-bold tracking-widest mb-6 border-b border-border pb-4">Pesanan Anda</h2>
            <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
              {items.map((item) => (
                <div key={item.product_id} className="flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold uppercase tracking-tight">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</p>
                  </div>
                  <span className="font-mono font-bold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-end border-t border-border pt-4">
                <span className="text-xs font-bold uppercase tracking-widest">Total Bayar</span>
                <span className="text-2xl font-bold font-serif italic text-primary">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
