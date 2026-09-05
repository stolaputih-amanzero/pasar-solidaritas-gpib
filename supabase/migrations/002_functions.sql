-- 002_functions.sql

-- 1. Authorization Helpers (SECURITY DEFINER with locked search_path)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    SELECT profiles.is_super_admin INTO is_admin FROM profiles WHERE id = auth.uid();
    RETURN COALESCE(is_admin, false);
END;
$$;
REVOKE EXECUTE ON FUNCTION is_super_admin FROM public;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO service_role;

CREATE OR REPLACE FUNCTION is_branch_admin(check_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM branch_members 
        WHERE branch_id = check_branch_id 
          AND profile_id = auth.uid() 
          AND role = 'branch_admin' 
          AND is_active = true
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION is_branch_admin FROM public;
GRANT EXECUTE ON FUNCTION is_branch_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_branch_admin TO service_role;

CREATE OR REPLACE FUNCTION is_supplier_of_product(check_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM products p
        JOIN branch_members bm ON p.branch_id = bm.branch_id AND p.supplier_id = bm.profile_id
        WHERE p.id = check_product_id 
          AND p.supplier_id = auth.uid()
          AND bm.role = 'supplier'
          AND bm.is_active = true
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION is_supplier_of_product FROM public;
GRANT EXECUTE ON FUNCTION is_supplier_of_product TO authenticated;
GRANT EXECUTE ON FUNCTION is_supplier_of_product TO service_role;

CREATE OR REPLACE FUNCTION is_supplier_of_order(check_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN branch_members bm ON p.branch_id = bm.branch_id AND p.supplier_id = bm.profile_id
        WHERE oi.order_id = check_order_id 
          AND p.supplier_id = auth.uid()
          AND bm.role = 'supplier'
          AND bm.is_active = true
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION is_supplier_of_order FROM public;
GRANT EXECUTE ON FUNCTION is_supplier_of_order TO authenticated;
GRANT EXECUTE ON FUNCTION is_supplier_of_order TO service_role;

-- 2. Audit Log Helper
CREATE OR REPLACE FUNCTION log_audit_event(
    p_branch_id UUID,
    p_table_name TEXT,
    p_record_id UUID,
    p_action TEXT,
    p_changes JSONB DEFAULT NULL,
    p_actor_id UUID DEFAULT auth.uid()
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO audit_logs (branch_id, table_name, record_id, action, actor_id, changes)
    VALUES (p_branch_id, p_table_name, p_record_id, p_action, p_actor_id, p_changes);
END;
$$;
REVOKE EXECUTE ON FUNCTION log_audit_event FROM public;
-- Internal use mostly.

-- 3. Triggers for Role Enforcement on Composite FKs
CREATE OR REPLACE FUNCTION check_product_supplier_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM branch_members
        WHERE branch_id = NEW.branch_id 
          AND profile_id = NEW.supplier_id 
          AND role = 'supplier' 
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Product supplier_id must have an active supplier role in the specified branch';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_product_supplier_role
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION check_product_supplier_role();

CREATE OR REPLACE FUNCTION check_order_buyer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Strict adherence to the Role Matrix: Only buyers can buy.
    IF NOT EXISTS (
        SELECT 1 FROM branch_members
        WHERE branch_id = NEW.branch_id 
          AND profile_id = NEW.buyer_id 
          AND role = 'buyer'
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Order buyer_id must be an active buyer of the specified branch';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_order_buyer_role
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION check_order_buyer_role();

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.role = 'branch_admin' THEN
        IF auth.role() IN ('anon', 'authenticated') THEN
            IF NOT is_super_admin() THEN
                RAISE EXCEPTION 'Only super admins can assign the branch_admin role';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_role_escalation
BEFORE INSERT OR UPDATE ON branch_members
FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- Prevent role changes if there are dependent records
CREATE OR REPLACE FUNCTION prevent_active_role_change() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF OLD.role = 'supplier' AND EXISTS (SELECT 1 FROM products WHERE branch_id = OLD.branch_id AND supplier_id = OLD.profile_id) THEN
            RAISE EXCEPTION 'Cannot change role of a supplier who has existing products in this branch';
        END IF;
        IF OLD.role = 'buyer' AND EXISTS (SELECT 1 FROM orders WHERE branch_id = OLD.branch_id AND buyer_id = OLD.profile_id) THEN
            RAISE EXCEPTION 'Cannot change role of a buyer who has existing orders in this branch';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_active_role_change 
BEFORE UPDATE ON branch_members 
FOR EACH ROW EXECUTE FUNCTION prevent_active_role_change();

-- 4. Atomic Checkout Transaction
CREATE OR REPLACE FUNCTION checkout_order(
    p_branch_id UUID,
    p_pickup_slot_id UUID,
    p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_buyer_id UUID := auth.uid();
    v_order_id UUID;
    v_total_amount NUMERIC(14,2) := 0;
    v_item RECORD;
    v_product RECORD;
    v_occupied_capacity INTEGER;
    v_slot_capacity INTEGER;
    v_slot_start TIMESTAMPTZ;
    v_branch_active BOOLEAN;
BEGIN
    -- Branch active check
    SELECT is_active INTO v_branch_active FROM branches WHERE id = p_branch_id;
    IF NOT FOUND OR NOT v_branch_active THEN 
        RAISE EXCEPTION 'Branch is not active or does not exist'; 
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Checkout items cannot be empty'; END IF;
    IF (SELECT count(*) FROM jsonb_array_elements(p_items)) != (SELECT count(DISTINCT value->>'product_id') FROM jsonb_array_elements(p_items)) THEN
        RAISE EXCEPTION 'Duplicate product IDs in checkout are not allowed';
    END IF;
    
    -- Strict adherence to the Role Matrix
    IF NOT EXISTS (
        SELECT 1 FROM branch_members 
        WHERE branch_id = p_branch_id 
          AND profile_id = v_buyer_id 
          AND role = 'buyer'
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User is not an active buyer in this branch';
    END IF;

    SELECT capacity, start_at INTO v_slot_capacity, v_slot_start 
    FROM pickup_slots WHERE id = p_pickup_slot_id AND branch_id = p_branch_id FOR UPDATE;
    
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid pickup slot'; END IF;
    IF v_slot_start <= now() THEN RAISE EXCEPTION 'Cannot checkout using a past or currently active pickup slot'; END IF;

    SELECT COUNT(*) INTO v_occupied_capacity FROM orders
    WHERE pickup_slot_id = p_pickup_slot_id
      AND status != 'cancelled'
      AND (status != 'pending_payment' OR expires_at > now());

    IF v_occupied_capacity >= v_slot_capacity THEN RAISE EXCEPTION 'Pickup slot is at full capacity'; END IF;

    INSERT INTO orders (branch_id, buyer_id, pickup_slot_id, expires_at)
    VALUES (p_branch_id, v_buyer_id, p_pickup_slot_id, now() + interval '30 minutes')
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
    LOOP
        IF v_item.quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be strictly positive'; END IF;

        SELECT * INTO v_product FROM products WHERE id = v_item.product_id AND branch_id = p_branch_id AND is_active = true FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found or inactive in this branch', v_item.product_id; END IF;
        IF v_product.stock < v_item.quantity THEN RAISE EXCEPTION 'Insufficient stock for product %', v_product.name; END IF;

        UPDATE products SET stock = stock - v_item.quantity WHERE id = v_product.id;

        INSERT INTO order_items (order_id, branch_id, product_id, quantity, price_at_time)
        VALUES (v_order_id, p_branch_id, v_product.id, v_item.quantity, v_product.price);

        v_total_amount := v_total_amount + (v_product.price * v_item.quantity);
    END LOOP;

    UPDATE orders SET total_amount = v_total_amount WHERE id = v_order_id;
    PERFORM log_audit_event(p_branch_id, 'orders', v_order_id, 'order_created', jsonb_build_object('total_amount', v_total_amount, 'items', p_items), v_buyer_id);
    RETURN v_order_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION checkout_order FROM public;
GRANT EXECUTE ON FUNCTION checkout_order TO authenticated;

-- 5. Expiry and Release
CREATE OR REPLACE FUNCTION release_expired_orders()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_order IN 
        SELECT id, branch_id FROM orders 
        WHERE status = 'pending_payment' AND expires_at <= now()
        FOR UPDATE
    LOOP
        FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = v_order.id
        LOOP
            UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
        END LOOP;
        
        UPDATE orders SET status = 'cancelled', expires_at = NULL WHERE id = v_order.id;
        PERFORM log_audit_event(v_order.branch_id, 'orders', v_order.id, 'order_expired_cancelled', NULL, NULL);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION release_expired_orders FROM public;
GRANT EXECUTE ON FUNCTION release_expired_orders TO service_role;

-- 6. Payment Submission (Client)
CREATE OR REPLACE FUNCTION submit_payment_proof(p_order_id UUID, p_file_path TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_branch_id UUID;
    v_order_status order_status;
    v_order_expires_at TIMESTAMPTZ;
    v_proof_id UUID;
BEGIN
    SELECT branch_id, status, expires_at 
    INTO v_branch_id, v_order_status, v_order_expires_at 
    FROM orders 
    WHERE id = p_order_id AND buyer_id = auth.uid() 
    FOR UPDATE;
    
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Order not found or you do not have permission'; 
    END IF;
    
    IF v_order_status != 'pending_payment' OR v_order_expires_at <= now() THEN
        RAISE EXCEPTION 'Order is not in pending_payment state or has expired';
    END IF;

    IF EXISTS (SELECT 1 FROM payment_proofs WHERE order_id = p_order_id AND status = 'pending') THEN
        RAISE EXCEPTION 'A pending payment proof already exists for this order';
    END IF;

    INSERT INTO payment_proofs (order_id, file_path, status)
    VALUES (p_order_id, p_file_path, 'pending')
    RETURNING id INTO v_proof_id;

    PERFORM log_audit_event(v_branch_id, 'payment_proofs', v_proof_id, 'proof_submitted', NULL, auth.uid());
    
    RETURN v_proof_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION submit_payment_proof FROM public;
GRANT EXECUTE ON FUNCTION submit_payment_proof TO authenticated;

-- 7. Payment Verification (Admin)
CREATE OR REPLACE FUNCTION verify_payment(p_proof_id UUID, p_new_status payment_status)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_branch_id UUID;
    v_current_status payment_status;
    v_order_status order_status;
    v_order_expires_at TIMESTAMPTZ;
BEGIN
    IF p_new_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid payment verification status. Must be approved or rejected.';
    END IF;

    SELECT order_id INTO v_order_id FROM payment_proofs WHERE id = p_proof_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment proof not found'; END IF;

    SELECT branch_id, status, expires_at 
    INTO v_branch_id, v_order_status, v_order_expires_at
    FROM orders 
    WHERE id = v_order_id 
    FOR UPDATE;

    IF v_order_status != 'pending_payment' THEN RAISE EXCEPTION 'Order is not pending payment'; END IF;
    IF v_order_expires_at <= now() THEN RAISE EXCEPTION 'Cannot verify payment for an expired order'; END IF;

    IF NOT (is_super_admin() OR is_branch_admin(v_branch_id)) THEN
        RAISE EXCEPTION 'Unauthorized to verify payments for this branch';
    END IF;

    SELECT status INTO v_current_status FROM payment_proofs WHERE id = p_proof_id FOR UPDATE;
    IF v_current_status != 'pending' THEN RAISE EXCEPTION 'Payment proof is already processed'; END IF;

    IF p_new_status = 'approved' THEN
        UPDATE payment_proofs SET status = 'approved', verified_by = auth.uid(), verified_at = now() WHERE id = p_proof_id;
        UPDATE orders SET status = 'confirmed', expires_at = NULL WHERE id = v_order_id;
        PERFORM log_audit_event(v_branch_id, 'orders', v_order_id, 'payment_approved', NULL, auth.uid());
    ELSIF p_new_status = 'rejected' THEN
        UPDATE payment_proofs SET status = 'rejected', verified_by = auth.uid(), verified_at = now() WHERE id = p_proof_id;
        PERFORM log_audit_event(v_branch_id, 'orders', v_order_id, 'payment_rejected', NULL, auth.uid());
    END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION verify_payment FROM public;
GRANT EXECUTE ON FUNCTION verify_payment TO authenticated;

-- 8. Order State Transition (Admin)
CREATE OR REPLACE FUNCTION update_order_status(p_order_id UUID, p_new_status order_status)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_branch_id UUID;
    v_current_status order_status;
    v_item RECORD;
BEGIN
    SELECT branch_id, status INTO v_branch_id, v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    IF NOT (is_super_admin() OR is_branch_admin(v_branch_id)) THEN
        RAISE EXCEPTION 'Unauthorized to update order status';
    END IF;

    IF v_current_status = p_new_status THEN
        RAISE EXCEPTION 'Order is already in state %', p_new_status;
    END IF;

    IF v_current_status = 'pending_payment' AND p_new_status != 'cancelled' THEN
        RAISE EXCEPTION 'Invalid transition from pending_payment to %. Use verify_payment() to confirm orders.', p_new_status;
    ELSIF v_current_status = 'confirmed' AND p_new_status NOT IN ('processing', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from confirmed to %', p_new_status;
    ELSIF v_current_status = 'processing' AND p_new_status NOT IN ('ready_for_pickup', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from processing to %', p_new_status;
    ELSIF v_current_status = 'ready_for_pickup' AND p_new_status != 'completed' THEN
        RAISE EXCEPTION 'Invalid transition from ready_for_pickup to %', p_new_status;
    ELSIF v_current_status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot transition from a terminal state (%)', v_current_status;
    END IF;

    IF p_new_status = 'cancelled' AND v_current_status IN ('pending_payment', 'confirmed', 'processing') THEN
        FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
        LOOP
            UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
        END LOOP;
    END IF;

    UPDATE orders SET status = p_new_status, expires_at = NULL WHERE id = p_order_id;
    
    PERFORM log_audit_event(v_branch_id, 'orders', p_order_id, 'status_updated', jsonb_build_object('from', v_current_status, 'to', p_new_status), auth.uid());
END;
$$;
REVOKE EXECUTE ON FUNCTION update_order_status FROM public;
GRANT EXECUTE ON FUNCTION update_order_status TO authenticated;

-- 9. Prevent Product Tenant Changes
CREATE OR REPLACE FUNCTION prevent_product_tenant_change() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
    IF NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
        RAISE EXCEPTION 'Product branch_id cannot be changed';
    END IF;
    IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
        IF NOT (is_super_admin() OR is_branch_admin(OLD.branch_id)) THEN
            RAISE EXCEPTION 'Product supplier_id cannot be changed by supplier';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_product_tenant_change 
BEFORE UPDATE ON products 
FOR EACH ROW EXECUTE FUNCTION prevent_product_tenant_change();

-- 10. Auto-create profile on Auth Signup (Supabase specific)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;
-- Note: Requires running this via a superuser or the Supabase dashboard SQL editor:
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
