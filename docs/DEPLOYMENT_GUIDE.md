# Panduan Deployment Produksi • Pasar Solidaritas GPIB v2

Dokumen ini memandu langkah-langkah deployment aplikasi **Pasar Solidaritas GPIB v2** ke lingkungan produksi (Vercel & Supabase).

---

## 1. Environment Variables (Vercel Production)

Tambahkan variabel lingkungan berikut pada **Project Settings > Environment Variables** di dashboard Vercel:

| Variabel | Deskripsi | Contoh Nilai |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL REST endpoint instance Supabase | `https://qkcjttkxsjmoncwyrfjt.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Anon JWT key Supabase | `eyJhbGciOiJIUzI1NiIsIn...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret Service Role key (*Server-side only*) | `eyJhbGciOiJIUzI1NiIsIn...` |
| `NEXT_PUBLIC_APP_URL` | Domain resmi aplikasi di produksi | `https://pasar-solidaritas-gpib.vercel.app` |

> [!CAUTION]
> Jangan pernah mencentang `NEXT_PUBLIC` pada `SUPABASE_SERVICE_ROLE_KEY` agar kunci rahasia tidak bocor ke browser client.

---

## 2. Checklist Konfigurasi Supabase Produksi

Sebelum mengumumkan platform kepada jemaat:

1. **Storage Buckets**:
   - Pastikan bucket `payment_proofs` (Private) dan `product_images` (Public) telah dibuat di Supabase Storage.
   - Kebijakan RLS storage telah aktif:
     - `payment_proofs`: Hanya pembeli dan admin cabang yang dapat membaca bukti bayar.
     - `product_images`: Dapat dibaca secara publik oleh semua pengunjung.
2. **Email Confirmation**:
   - Di dashboard Supabase (`Authentication > Providers > Email`), aktifkan kembali opsi *Confirm email* untuk akun jemaat di lingkungan produksi.
3. **Database Backup**:
   - Aktifkan fitur *Daily Backup* atau *Point-In-Time Recovery (PITR)* di Supabase Settings.

---

## 3. Fitur Progressive Web App (PWA)

Aplikasi telah dilengkapi standar PWA penuh:
- **Web App Manifest**: [`/manifest.json`](file:///public/manifest.json)
- **Service Worker**: [`/sw.js`](file:///public/sw.js) (Mendukung offline fallback ke [`/offline.html`](file:///public/offline.html) dan runtime caching aset statis).
- **Ikon Aplikasi**:
  - `public/icons/icon-192x192.png` (Standard Android)
  - `public/icons/icon-512x512.png` (Splash screen)
  - `public/icons/icon-maskable-192x192.png` & `512x512.png` (Android Adaptive Icons)
  - `public/icons/apple-touch-icon.png` (iOS Safari homescreen)

### Cara Memasang di Ponsel Jemaat:
* **Android (Chrome)**: Kunjungi website → Tekan menu titik tiga (⋮) → Pilih **"Install app"** atau **"Tambahkan ke Layar Utama"**.
* **iOS (Safari)**: Kunjungi website → Tekan tombol Share (kotak bertanda panah ke atas) → Pilih **"Add to Home Screen"** (*Tambahkan ke Layar Utama*).

---

## 4. Perintah Deployment Vercel

### Metode A: Integrasi Otomatis GitHub (Direkomendasikan)
1. Buka [Vercel Dashboard](https://vercel.com/new).
2. Impor repositori: `stolaputih-amanzero/pasar-solidaritas-gpib`.
3. Masukkan Environment Variables sesuai poin 1 di atas.
4. Klik **Deploy**. Setiap `git push` ke cabang `main` akan memicu deployment otomatis.

### Metode B: Melalui Vercel CLI
```bash
# 1. Login ke Vercel
pnpm dlx vercel login

# 2. Deploy ke staging / preview
pnpm dlx vercel

# 3. Deploy langsung ke produksi
pnpm dlx vercel --prod
```
