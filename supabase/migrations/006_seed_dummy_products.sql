-- Seed Dummy Supplier & Products for Toba Tabo
DO $$
DECLARE
  v_branch_id UUID := '11111111-1111-1111-1111-111111111111';
  v_supplier_id UUID := '00000000-0000-0000-0000-000000000001';
  v_cat_kuliner UUID := '33333333-3333-3333-3333-333333333333';
  v_cat_kerajinan UUID := '44444444-4444-4444-4444-444444444444';
BEGIN
  -- 1. Buat User Dummy (Bypass Auth Trigger untuk keperluan seed manual)
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (v_supplier_id, 'supplier.toba@dummy.com', '{"full_name": "Supplier Toba"}')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Buat Profile
  INSERT INTO profiles (id, full_name)
  VALUES (v_supplier_id, 'Supplier Toba')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Daftarkan sebagai Supplier di Cabang Toba Tabo
  INSERT INTO branch_members (branch_id, profile_id, role, is_active)
  VALUES (v_branch_id, v_supplier_id, 'supplier', true)
  ON CONFLICT (branch_id, profile_id) DO NOTHING;

  -- 4. Insert Produk Dummy
  INSERT INTO products (branch_id, supplier_id, category_id, name, description, price, stock, is_active)
  VALUES
    (v_branch_id, v_supplier_id, v_cat_kuliner, 'Kopi Arabika Toba', 'Kopi asli dataran tinggi Toba, dipanen langsung oleh petani lokal.', 85000, 50, true),
    (v_branch_id, v_supplier_id, v_cat_kerajinan, 'Tenun Ulos Tradisional', 'Kain tenun otentik dengan motif klasik.', 250000, 15, true),
    (v_branch_id, v_supplier_id, v_cat_kuliner, 'Sambal Andalas', 'Sambal khas dengan cita rasa pedas nikmat.', 35000, 0, true)
  ON CONFLICT DO NOTHING;
END $$;
