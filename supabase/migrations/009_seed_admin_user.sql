-- 009_seed_admin_user.sql
-- Standar Resmi Supabase: Assign Role Admin ke akun yang sudah terdaftar di Auth

-- 1. Bersihkan data auth dummy jika sebelumnya sempat corrupt/setengah terbuat
DELETE FROM auth.users WHERE email = 'admin@pasarsolidaritas.com';

-- 2. Pastikan trigger prevent_role_escalation mengizinkan DB admin / SQL Editor
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.role = 'branch_admin' THEN
        -- Hanya batasi jika request datang dari client API anon/authenticated biasa
        IF auth.role() IN ('anon', 'authenticated') THEN
            IF NOT is_super_admin() THEN
                RAISE EXCEPTION 'Only super admins can assign the branch_admin role';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Query untuk meng-elevasi user menjadi Super Admin & Branch Admin
-- (Jalankan query di bawah ini SETELAH Anda membuat user di menu Authentication -> Users atau lewat /signup)
/*
UPDATE public.profiles
SET is_super_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@pasarsolidaritas.com');

INSERT INTO public.branch_members (branch_id, profile_id, role, is_active)
SELECT 
  '11111111-1111-1111-1111-111111111111', 
  id, 
  'branch_admin', 
  true
FROM auth.users WHERE email = 'admin@pasarsolidaritas.com'
ON CONFLICT (branch_id, profile_id) 
DO UPDATE SET role = 'branch_admin', is_active = true;
*/
