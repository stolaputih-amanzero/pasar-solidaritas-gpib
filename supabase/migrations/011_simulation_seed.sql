-- 011_simulation_seed.sql
-- Seed Komprehensif Simulasi Ekosistem Pasar Solidaritas GPIB v2
-- Mencakup: Cabang Tambahan, Kategori, Produk Premium, Banners, Ulasan Jemaat, dan Historis Penjualan

-- 1. CABANG-CABANG JEMAAT GPIB
INSERT INTO branches (id, name, slug, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'GPIB Toba Tabo Jakarta', 'toba-tabo', true),
  ('22222222-2222-2222-2222-222222222222', 'GPIB Immanuel Gambir', 'immanuel-jakarta', true),
  ('33333333-3333-3333-3333-333333333332', 'GPIB Paulus Menteng', 'paulus-menteng', true),
  ('44444444-4444-4444-4444-444444444442', 'GPIB Surya Kasih', 'surya-kasih', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active;

-- 2. KATEGORI PRODUK
INSERT INTO categories (id, name, slug, is_active)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Kuliner & Pangan', 'kuliner', true),
  ('44444444-4444-4444-4444-444444444444', 'Kriya & Kerajinan', 'kerajinan', true),
  ('55555555-5555-5555-5555-555555555555', 'Hasil Bumi Alami', 'hasil-bumi', true),
  ('66666666-6666-6666-6666-666666666661', 'Wastra & Tenun', 'wastra', true),
  ('66666666-6666-6666-6666-666666666662', 'Herbal & Kesehatan', 'herbal-kesehatan', true),
  ('66666666-6666-6666-6666-666666666663', 'Karya Pemuda & POUK', 'karya-pemuda', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active;

-- 3. EDITORIAL PROMOTIONAL BANNERS
INSERT INTO promotional_banners (id, branch_id, title, subtitle, badge_text, image_url, cta_text, cta_link, is_active, sort_order)
VALUES
  ('d1111111-0000-0000-0000-000000000001', NULL, 'Bazar Paskah Solidaritas 2026', 'Dukung UMKM & hasil bumi jemaat dalam menyambut hari raya kebangkitan dengan harga saling menopang.', 'WARTA SOLIDARITAS', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1200', 'Jelajahi Produk', '/toba-tabo', true, 1),
  ('d1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Kopi Toba Fest 2026', 'Festival panen raya kopi arabika single-origin langsung dari kebun petani jemaat kawasan Danau Toba.', 'FESTIVAL PANEN', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=1200', 'Beli Kopi Segar', '/toba-tabo/produk/c94b8b72-e639-450e-ba2a-486fcebf5cc0', true, 2),
  ('d1111111-0000-0000-0000-000000000003', NULL, 'Wastra Nusantara Tenun Kasih', 'Kain tenun ulos dan songket tangan asli berdayakan ibu-ibu penenun jemaat dengan martabat budaya.', 'WARISAN BUDAYA', 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&q=80&w=1200', 'Lihat Koleksi', '/toba-tabo/produk/4c9821a8-d63a-47b2-b45b-59b953bf37f3', true, 3),
  ('d1111111-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'Dapur Immanuel: Kue Paskah Tradisional', 'Nastar wisman dan kue-kue kering resep turun-temurun Pelkat PKP GPIB Immanuel Jakarta.', 'KULINER KHAS', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=1200', 'Pesan Sekarang', '/immanuel-jakarta', true, 4)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  badge_text = EXCLUDED.badge_text,
  image_url = EXCLUDED.image_url,
  cta_text = EXCLUDED.cta_text,
  cta_link = EXCLUDED.cta_link,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;
