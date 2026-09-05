-- 004_seed.sql

-- Seed initial branch
INSERT INTO branches (id, name, slug, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Toba Tabo', 'toba-tabo', true)
ON CONFLICT (slug) DO NOTHING;

-- Seed global categories
INSERT INTO categories (id, name, slug, description, is_active) VALUES
('33333333-3333-3333-3333-333333333333', 'Kuliner', 'kuliner', 'Makanan dan minuman hasil karya jemaat', true),
('44444444-4444-4444-4444-444444444444', 'Kerajinan', 'kerajinan', 'Karya seni dan kerajinan tangan', true),
('55555555-5555-5555-5555-555555555555', 'Hasil Bumi', 'hasil-bumi', 'Sayuran dan buah-buahan segar', true)
ON CONFLICT (slug) DO NOTHING;

-- Seed pickup slots for Toba Tabo
INSERT INTO pickup_slots (id, branch_id, start_at, end_at, capacity) VALUES
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '2026-09-13 08:00:00+07', '2026-09-13 12:00:00+07', 50),
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '2026-09-13 13:00:00+07', '2026-09-13 17:00:00+07', 50)
ON CONFLICT DO NOTHING;
