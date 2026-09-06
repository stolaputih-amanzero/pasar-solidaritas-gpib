-- supabase/migrations/012_payment_proof_rejection_reason.sql

-- 1. Tambahkan kolom rejection_reason ke tabel payment_proofs
ALTER TABLE public.payment_proofs 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Drop signature lama
DROP FUNCTION IF EXISTS public.verify_payment(UUID, payment_status);
DROP FUNCTION IF EXISTS public.verify_payment(UUID, TEXT);
DROP FUNCTION IF EXISTS public.verify_payment(UUID, payment_status, TEXT);
DROP FUNCTION IF EXISTS public.verify_payment(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.verify_payment(UUID, TEXT, UUID, TEXT);

-- 3. Buat ulang fungsi verify_payment dengan dukungan p_rejection_reason
CREATE OR REPLACE FUNCTION public.verify_payment(
    p_proof_id UUID,
    p_new_status TEXT,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_branch_id UUID;
    v_order_status order_status;
    v_order_expires_at TIMESTAMPTZ;
    v_current_status payment_status;
BEGIN
    IF p_new_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid payment verification status. Must be approved or rejected.';
    END IF;

    -- Ambil order_id dan branch_id
    SELECT pp.order_id, o.branch_id, o.status, o.expires_at, pp.status
    INTO v_order_id, v_branch_id, v_order_status, v_order_expires_at, v_current_status
    FROM public.payment_proofs pp
    JOIN public.orders o ON pp.order_id = o.id
    WHERE pp.id = p_proof_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment proof not found';
    END IF;

    -- Validasi status order & expiry
    IF v_order_status != 'pending_payment' THEN 
        RAISE EXCEPTION 'Order is not pending payment'; 
    END IF;
    
    IF v_order_expires_at <= now() THEN 
        RAISE EXCEPTION 'Cannot verify payment for an expired order'; 
    END IF;

    -- Validasi status bukti saat ini
    IF v_current_status != 'pending' THEN 
        RAISE EXCEPTION 'Payment proof is already processed'; 
    END IF;

    -- Validasi Hak Akses: Harus Super Admin atau Branch Admin dari cabang terkait
    IF NOT (public.is_super_admin() OR public.is_branch_admin(v_branch_id)) THEN
        RAISE EXCEPTION 'Unauthorized to verify payment for this branch';
    END IF;

    -- Update status bukti pembayaran
    UPDATE public.payment_proofs
    SET 
        status = p_new_status::payment_status,
        verified_by = auth.uid(),
        verified_at = NOW(),
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_rejection_reason ELSE NULL END
    WHERE id = p_proof_id;

    -- Update status pesanan berdasarkan hasil verifikasi
    IF p_new_status = 'approved' THEN
        UPDATE public.orders
        SET status = 'confirmed', expires_at = NULL, updated_at = NOW()
        WHERE id = v_order_id;
        
        PERFORM public.log_audit_event(v_branch_id, 'orders', v_order_id, 'payment_approved', NULL, auth.uid());
    ELSIF p_new_status = 'rejected' THEN
        -- Status order tetap 'pending_payment' agar pembeli bisa upload ulang
        UPDATE public.orders
        SET updated_at = NOW()
        WHERE id = v_order_id;
        
        PERFORM public.log_audit_event(
            v_branch_id, 
            'orders', 
            v_order_id, 
            'payment_rejected', 
            jsonb_build_object('proof_id', p_proof_id, 'rejection_reason', p_rejection_reason), 
            auth.uid()
        );
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment(UUID, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_payment(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment(UUID, TEXT, TEXT) TO service_role;
