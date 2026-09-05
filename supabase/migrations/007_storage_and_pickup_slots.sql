-- 007_storage_and_pickup_slots.sql

-- 1. Buat bucket private untuk bukti pembayaran
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: User hanya bisa upload ke folder berdasarkan user_id mereka
CREATE POLICY "Buyers can upload own payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Policy: User bisa melihat/menghapus file di folder mereka sendiri
CREATE POLICY "Buyers can manage own payment proofs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Policy: Branch Admin & Super Admin bisa melihat semua bukti pembayaran
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs' 
  AND (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
    OR 
    EXISTS (
      SELECT 1 FROM branch_members bm
      WHERE bm.profile_id = auth.uid() AND bm.role = 'branch_admin' AND bm.is_active = true
    )
  )
);

-- 5. Seed / Update Pickup Slots to future dates (7 & 14 days ahead) for branch Toba Tabo
INSERT INTO pickup_slots (id, branch_id, start_at, end_at, capacity)
VALUES 
  (
    '55555555-5555-5555-5555-555555555551',
    '11111111-1111-1111-1111-111111111111',
    date_trunc('day', now() + interval '3 days') + time '10:00:00',
    date_trunc('day', now() + interval '3 days') + time '12:00:00',
    30
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '11111111-1111-1111-1111-111111111111',
    date_trunc('day', now() + interval '7 days') + time '14:00:00',
    date_trunc('day', now() + interval '7 days') + time '16:00:00',
    25
  )
ON CONFLICT (id) DO UPDATE 
SET 
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  capacity = EXCLUDED.capacity;
