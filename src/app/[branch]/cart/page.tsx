"use client"

import { useCart } from "@/components/providers/cart-provider"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"

export default function BranchCartPage() {
  const params = useParams()
  const branchSlug = params?.branch as string
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCart()

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto w-full min-h-[calc(100vh-140px)]">
      <div className="mb-10 border-b border-border pb-6">
        <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-muted-foreground">Keranjang Belanja</span>
        <h1 className="text-4xl font-bold tracking-tighter mt-2">Ulasan Pesanan</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 border border-border border-dashed">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Keranjang Anda masih kosong</p>
          <Link href={`/${branchSlug}/katalog`}>
            <Button>KEMBALI KE KATALOG</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="col-span-1 md:col-span-8">
            <div className="border border-border">
              {items.map((item) => (
                <div key={item.product_id} className="flex gap-4 p-4 border-b border-border last:border-b-0">
                  <div className="w-24 h-24 bg-secondary relative shrink-0">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground font-mono">
                        NO IMG
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold uppercase tracking-tight text-sm">{item.name}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">S: {item.supplier_name}</p>
                      </div>
                      <p className="font-bold font-serif text-primary">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center border border-border">
                        <button 
                          className="px-3 py-1 bg-background hover:bg-secondary transition-colors"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="px-4 py-1 text-sm font-mono border-x border-border">{item.quantity}</span>
                        <button 
                          className="px-3 py-1 bg-background hover:bg-secondary transition-colors"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                        >
                          +
                        </button>
                      </div>
                      <button 
                        onClick={() => removeItem(item.product_id)}
                        className="text-[10px] font-bold uppercase tracking-widest text-destructive hover:underline underline-offset-4"
                      >
                        HAPUS
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-4">
            <div className="bg-secondary/20 border border-border p-6 sticky top-10">
              <h2 className="text-[10px] uppercase font-bold tracking-widest mb-6 border-b border-border pb-4">Ringkasan</h2>
              
              <div className="space-y-3 text-sm mb-6 pb-6 border-b border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                  <span className="font-mono">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Biaya Penanganan</span>
                  <span className="font-mono">Rp 0</span>
                </div>
              </div>
              
              <div className="flex justify-between items-end mb-8">
                <span className="text-xs font-bold uppercase tracking-widest">Total</span>
                <span className="text-2xl font-bold text-primary font-serif italic">Rp {totalPrice.toLocaleString('id-ID')}</span>
              </div>
              
              <Link href={`/${branchSlug}/checkout`}>
                <Button className="w-full">LANJUT KE PEMBAYARAN</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
