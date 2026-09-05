'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, AlertTriangle, CheckCircle2, Download, Loader2, ArrowLeft } from 'lucide-react'
import { bulkImportProducts } from '@/actions/supplier'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Category = { id: string; slug: string; name: string }

type CsvRow = {
  nama_produk: string
  kategori_slug: string
  deskripsi: string
  harga: string
  stok: string
}

type ParsedProduct = {
  name: string
  category_id: string | null
  description: string
  price: number
  stock: number
  _row: number
  _errors: string[]
}

export function CsvImportForm({
  branchId,
  branchSlug,
  categories,
}: {
  branchId: string
  branchSlug: string
  categories: Category[]
}) {
  const router = useRouter()
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  const downloadTemplate = () => {
    const csv = 'nama_produk,kategori_slug,deskripsi,harga,stok\nKopi Arabika Tarutung 250g,kuliner,Kopi arabika asli pegunungan Toba,85000,50\nTenun Ulos Harungguan,kerajinan,Tenun ulos katun motif klasik jemaat,350000,10\nSambal Andaliman Pedas,kuliner,Sambal khas rempah andaliman segar,35000,30'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-produk-pasar-solidaritas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: ParsedProduct[] = []
        const errs: string[] = []

        results.data.forEach((row, idx) => {
          const rowNum = idx + 2
          const rowErrors: string[] = []

          if (!row.nama_produk?.trim()) {
            rowErrors.push('Nama produk tidak boleh kosong')
          }

          const price = parseFloat(row.harga)
          if (isNaN(price) || price < 0) {
            rowErrors.push('Harga tidak valid (harus berupa angka positif)')
          }

          const stock = parseInt(row.stok, 10)
          if (isNaN(stock) || stock < 0) {
            rowErrors.push('Stok tidak valid (harus berupa bilangan bulat)')
          }

          const catSlug = row.kategori_slug?.trim().toLowerCase()
          const category = categories.find((c) => c.slug.toLowerCase() === catSlug)
          if (catSlug && !category) {
            rowErrors.push(`Kategori "${row.kategori_slug}" tidak terdaftar (pilihan: ${categories.map(c => c.slug).join(', ')})`)
          }

          if (rowErrors.length > 0) {
            errs.push(`Baris ${rowNum}: ${rowErrors.join('; ')}`)
          }

          parsed.push({
            name: row.nama_produk?.trim() || '',
            category_id: category?.id || null,
            description: row.deskripsi?.trim() || '',
            price: price || 0,
            stock: stock || 0,
            _row: rowNum,
            _errors: rowErrors,
          })
        })

        setProducts(parsed)
        setErrors(errs)
      },
    })
  }

  const validProducts = products.filter((p) => p._errors.length === 0)

  const handleImport = async () => {
    if (validProducts.length === 0) return
    setSubmitting(true)
    try {
      const toInsert = validProducts.map(({ _row, _errors, ...p }) => p)
      const res = await bulkImportProducts(branchId, toInsert)
      setImportedCount(res.count)
      setTimeout(() => {
        router.push(`/${branchSlug}/supplier`)
      }, 1500)
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Gagal mengimpor produk.')
      setSubmitting(false)
    }
  }

  if (importedCount !== null) {
    return (
      <Card className="p-8 text-center bg-primary/5 border-primary/20">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground">Impor Berhasil Disimpan!</h3>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Sebanyak {importedCount} produk baru telah berhasil didaftarkan ke etalase Anda.
        </p>
        <Link href={`/${branchSlug}/supplier`}>
          <Button>Kembali ke Katalog Saya</Button>
        </Link>
      </Card>
    )
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-tight">
            Formulir Unggah CSV
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Gunakan format berkas CSV yang sesuai standar untuk memproses banyak produk sekaligus.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Unduh Template CSV
        </Button>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Drag & Drop Upload Zone */}
        <div className="border-2 border-dashed border-border p-8 text-center hover:border-primary transition-colors bg-secondary/10">
          <Upload className="h-8 w-8 mx-auto text-primary mb-3" />
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Pilih Berkas CSV
          </label>
          <p className="text-[11px] text-muted-foreground mt-3">
            Header kolom wajib: <span className="font-mono font-bold text-foreground">nama_produk, kategori_slug, deskripsi, harga, stok</span>
          </p>
        </div>

        {/* Validation Errors Box */}
        {errors.length > 0 && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-2">
              <AlertTriangle className="h-4 w-4" /> Ditemukan {errors.length} Kesalahan Format
            </div>
            <ul className="text-xs list-disc list-inside space-y-1 max-h-40 overflow-y-auto font-mono">
              {errors.slice(0, 10).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {errors.length > 10 && <li>...dan {errors.length - 10} baris lainnya</li>}
            </ul>
          </div>
        )}

        {/* Preview Table */}
        {validProducts.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-primary font-bold">
                <CheckCircle2 className="h-4 w-4" /> {validProducts.length} Produk Valid Siap Diimpor
              </div>
              <span className="text-muted-foreground font-mono">
                {validProducts.length} dari {products.length} baris
              </span>
            </div>

            <div className="border border-border overflow-x-auto bg-background">
              <table className="w-full text-xs">
                <thead className="bg-secondary/40 border-b border-border uppercase font-mono text-[10px] text-muted-foreground">
                  <tr>
                    <th className="text-left p-2.5">Nama Produk</th>
                    <th className="text-left p-2.5">Kategori</th>
                    <th className="text-right p-2.5">Harga</th>
                    <th className="text-right p-2.5">Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {validProducts.slice(0, 8).map((p, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      <td className="p-2.5 font-medium">{p.name}</td>
                      <td className="p-2.5 text-muted-foreground">
                        {categories.find((c) => c.id === p.category_id)?.name || '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-primary">
                        Rp {p.price.toLocaleString('id-ID')}
                      </td>
                      <td className="p-2.5 text-right font-mono">{p.stock}</td>
                    </tr>
                  ))}
                  {validProducts.length > 8 && (
                    <tr className="bg-secondary/10">
                      <td colSpan={4} className="p-2.5 text-center text-muted-foreground font-mono text-[11px]">
                        ...dan {validProducts.length - 8} produk lainnya
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Button
              className="w-full uppercase tracking-wider font-bold"
              size="lg"
              onClick={handleImport}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Memproses Impor Massal...' : `Konfirmasi Impor ${validProducts.length} Produk ke Etalase`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
