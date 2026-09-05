-- 008_supplier_dashboard_and_storage.sql

-- 1. Buat bucket publik untuk gambar produk (product-images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for product-images
-- Siapapun dapat melihat gambar produk publik
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Supplier dan Admin dapat mengunggah gambar produk
DROP POLICY IF EXISTS "Suppliers and Admins can upload product images" ON storage.objects;
CREATE POLICY "Suppliers and Admins can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
    OR EXISTS (
      SELECT 1 FROM branch_members bm
      WHERE bm.profile_id = auth.uid() 
        AND bm.role IN ('supplier', 'branch_admin') 
        AND bm.is_active = true
    )
  )
);

-- 3. Fix Policy INSERT Products untuk Supplier
-- is_supplier_of_product(id) memeriksa baris yang sudah ada di tabel products, sehingga gagal saat INSERT.
DROP POLICY IF EXISTS "Suppliers can insert own products" ON products;
CREATE POLICY "Suppliers can insert own products" ON products FOR INSERT TO authenticated 
WITH CHECK (
  supplier_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM branch_members bm 
    WHERE bm.branch_id = products.branch_id 
      AND bm.profile_id = auth.uid() 
      AND bm.role = 'supplier' 
      AND bm.is_active = true
  )
);
