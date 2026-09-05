"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { supabase } from "@/lib/supabase/client"
import { ensureBranchMember } from "@/lib/supabase/api"
import { Category, Branch } from "@/types/database"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

const productSchema = z.object({
  name: z.string().min(3, "Nama produk minimal 3 karakter"),
  description: z.string().optional(),
  story: z.string().optional(),
  price: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
  category_id: z.string().min(1, "Silakan pilih kategori"),
  cover_image_path: z.string().optional(),
})

export default function BranchAddProductPage() {
  const params = useParams()
  const branchSlug = params?.branch as string
  const { user } = useAuth()
  const router = useRouter()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [categories, setCategories] = useState<Category[]>([])

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      price: 0,
      stock: 1,
    }
  })

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
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (data) setCategories(data)
    }
    fetchCategories()
  }, [])

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    if (!user || !branch) return
    setLoading(true)
    setError("")

    try {
      // 1. Ensure user is an active supplier in this branch
      await ensureBranchMember(branch.id, 'supplier')

      // 2. Insert into products table
      const { error: insertError } = await supabase.from('products').insert({
        branch_id: branch.id,
        supplier_id: user.id,
        category_id: data.category_id,
        name: data.name,
        description: data.description || null,
        price: data.price,
        stock: data.stock,
        cover_image_path: data.cover_image_path || null,
        is_active: true,
      })

      if (insertError) throw insertError

      // 3. Update supplier story in supplier_profiles if provided
      if (data.story) {
        await supabase.from('supplier_profiles').upsert({
          profile_id: user.id,
          display_name: user.user_metadata?.full_name || 'Supplier Jemaat',
          story: data.story
        })
      }

      router.push(`/${branchSlug}/supplier`)
      router.refresh()
    } catch (err: any) {
      console.error("Add product error:", err)
      setError(err.message || "Terjadi kesalahan saat menyimpan produk")
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8 pb-4 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight">Tambah Produk Baru ({branch?.name})</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Publikasikan karya dan hasil panen Anda ke katalog {branch?.name}.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/20 bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      <Card className="border-border">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name">Nama Produk</Label>
                <Input id="name" placeholder="Misal: Kopi Arabica Lintong 250gr" {...register("name")} />
                {errors.name && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.name.message}</p>}
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="category_id">Kategori</Label>
                <select 
                  id="category_id" 
                  className="flex h-10 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-none"
                  {...register("category_id")}
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.category_id && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.category_id.message}</p>}
              </div>

              <div className="space-y-3">
                <Label htmlFor="price">Harga (Rp)</Label>
                <Input id="price" type="number" {...register("price")} />
                {errors.price && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.price.message}</p>}
              </div>

              <div className="space-y-3">
                <Label htmlFor="stock">Stok Awal</Label>
                <Input id="stock" type="number" {...register("stock")} />
                {errors.stock && <p className="text-[10px] text-destructive font-bold uppercase tracking-wider">{errors.stock.message}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="cover_image_path">URL Foto Produk</Label>
              <Input id="cover_image_path" placeholder="https://..." {...register("cover_image_path")} />
              <p className="text-[10px] text-muted-foreground">Tautan gambar sampul produk Anda.</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="description">Deskripsi Produk</Label>
              <textarea 
                id="description" 
                rows={3}
                className="flex w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-none"
                placeholder="Rincian bahan, proses pengolahan, atau cara penyajian..."
                {...register("description")}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="story">Kisah di Balik Produk (Editorial Storytelling)</Label>
              <textarea 
                id="story" 
                rows={3}
                className="flex w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-none font-serif italic"
                placeholder="Ceritakan latar belakang usaha keluarga, tradisi jemaat, atau harapan Anda..."
                {...register("story")}
              />
              <p className="text-[10px] text-muted-foreground">Kisah ini akan disorot di etalase dan halaman detail produk.</p>
            </div>

            <div className="flex justify-end gap-4 border-t border-border pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()}>BATAL</Button>
              <Button type="submit" disabled={loading} className="font-bold uppercase tracking-widest text-xs">
                {loading ? "MENYIMPAN..." : "SIMPAN PRODUK"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
