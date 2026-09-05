-- 003_rls.sql

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Block updating is_super_admin from client API completely
CREATE OR REPLACE FUNCTION block_is_super_admin_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
        -- Only allow changes from service_role or true database superuser
        IF auth.role() IN ('anon', 'authenticated') THEN
            RAISE EXCEPTION 'Cannot modify is_super_admin via client API';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_is_super_admin_update
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION block_is_super_admin_update();

-- ============================================================================
-- 1. Branches
-- ============================================================================
CREATE POLICY "Anyone can view active branches" ON branches FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Super admins can view all branches" ON branches FOR SELECT TO authenticated USING ((select is_super_admin()));
CREATE POLICY "Super admins can insert branches" ON branches FOR INSERT TO authenticated WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can update branches" ON branches FOR UPDATE TO authenticated USING ((select is_super_admin())) WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can delete branches" ON branches FOR DELETE TO authenticated USING ((select is_super_admin()));

-- ============================================================================
-- 2. Profiles
-- ============================================================================
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (id = (select auth.uid()));
CREATE POLICY "Super admins can view all profiles" ON profiles FOR SELECT TO authenticated USING ((select is_super_admin()));
-- Explicit decision: Branch admins need phone numbers to contact buyers.
CREATE POLICY "Branch admins can view profiles in their branch" ON profiles FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM branch_members bm
        WHERE bm.profile_id = profiles.id AND (select is_branch_admin(bm.branch_id))
    )
);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));
CREATE POLICY "Super admins can insert profiles" ON profiles FOR INSERT TO authenticated WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can update profiles" ON profiles FOR UPDATE TO authenticated USING ((select is_super_admin())) WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can delete profiles" ON profiles FOR DELETE TO authenticated USING ((select is_super_admin()));

-- ============================================================================
-- 3. Branch Members
-- ============================================================================
CREATE POLICY "Users can view their own memberships" ON branch_members FOR SELECT TO authenticated USING (profile_id = (select auth.uid()));
CREATE POLICY "Branch and super admins can view memberships in their branches" ON branch_members FOR SELECT TO authenticated USING (
    (select is_super_admin()) OR (select is_branch_admin(branch_id))
);

-- Admin CRUD operations (Super Admin)
CREATE POLICY "Super admins can insert memberships" ON branch_members FOR INSERT TO authenticated WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can update memberships" ON branch_members FOR UPDATE TO authenticated USING ((select is_super_admin())) WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can delete memberships" ON branch_members FOR DELETE TO authenticated USING ((select is_super_admin()));

-- Admin CRUD operations (Branch Admin) - Restricted to buyer/supplier
CREATE POLICY "Branch admins can insert buyers and suppliers" ON branch_members FOR INSERT TO authenticated
WITH CHECK (
    (select is_branch_admin(branch_id)) 
    AND role IN ('buyer', 'supplier')
);
CREATE POLICY "Branch admins can update buyers and suppliers" ON branch_members FOR UPDATE TO authenticated
USING (
    (select is_branch_admin(branch_id)) 
    AND role IN ('buyer', 'supplier')
)
WITH CHECK (
    (select is_branch_admin(branch_id)) 
    AND role IN ('buyer', 'supplier')
);
CREATE POLICY "Branch admins can delete buyers and suppliers" ON branch_members FOR DELETE TO authenticated
USING (
    (select is_branch_admin(branch_id)) 
    AND role IN ('buyer', 'supplier')
);

-- ============================================================================
-- 4. Categories
-- ============================================================================
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Super admins can view all categories" ON categories FOR SELECT TO authenticated USING ((select is_super_admin()));
CREATE POLICY "Super admins can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can update categories" ON categories FOR UPDATE TO authenticated USING ((select is_super_admin())) WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can delete categories" ON categories FOR DELETE TO authenticated USING ((select is_super_admin()));

-- ============================================================================
-- 5. Supplier Profiles (Global Identity)
-- ============================================================================
CREATE POLICY "Anyone can view public supplier profiles" ON supplier_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Suppliers can update own profile" ON supplier_profiles FOR UPDATE TO authenticated USING (profile_id = (select auth.uid())) WITH CHECK (profile_id = (select auth.uid()));
CREATE POLICY "Super admins can insert supplier profiles" ON supplier_profiles FOR INSERT TO authenticated WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can update supplier profiles" ON supplier_profiles FOR UPDATE TO authenticated USING ((select is_super_admin())) WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can delete supplier profiles" ON supplier_profiles FOR DELETE TO authenticated USING ((select is_super_admin()));
-- Branch admins cannot edit the global supplier profile.

-- ============================================================================
-- 6. Products
-- ============================================================================
CREATE POLICY "Anyone can view active products in active branches" ON products FOR SELECT TO anon, authenticated 
USING (
    is_active = true 
    AND EXISTS (
        SELECT 1 FROM branches b WHERE b.id = products.branch_id AND b.is_active = true
    )
);

-- SELECT permits historical view even if deactivated as supplier
CREATE POLICY "Suppliers can view own products" ON products FOR SELECT TO authenticated 
USING (supplier_id = (select auth.uid()));

CREATE POLICY "Branch admins can view branch products" ON products FOR SELECT TO authenticated 
USING ((select is_branch_admin(branch_id)));

CREATE POLICY "Super admins can view all products" ON products FOR SELECT TO authenticated 
USING ((select is_super_admin()));

-- INSERT, UPDATE, DELETE require ACTIVE membership via the helper
CREATE POLICY "Suppliers can insert own products" ON products FOR INSERT TO authenticated 
WITH CHECK ((select is_supplier_of_product(id)));

CREATE POLICY "Suppliers can update own products" ON products FOR UPDATE TO authenticated 
USING ((select is_supplier_of_product(id))) 
WITH CHECK ((select is_supplier_of_product(id)));

CREATE POLICY "Suppliers can delete own products" ON products FOR DELETE TO authenticated 
USING ((select is_supplier_of_product(id)));

CREATE POLICY "Branch admins can insert branch products" ON products FOR INSERT TO authenticated 
WITH CHECK ((select is_branch_admin(branch_id)));

CREATE POLICY "Branch admins can update branch products" ON products FOR UPDATE TO authenticated 
USING ((select is_branch_admin(branch_id))) 
WITH CHECK ((select is_branch_admin(branch_id)));

CREATE POLICY "Branch admins can delete branch products" ON products FOR DELETE TO authenticated 
USING ((select is_branch_admin(branch_id)));

CREATE POLICY "Super admins can insert products" ON products FOR INSERT TO authenticated WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can update products" ON products FOR UPDATE TO authenticated USING ((select is_super_admin())) WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can delete products" ON products FOR DELETE TO authenticated USING ((select is_super_admin()));

-- ============================================================================
-- 7. Product Images
-- ============================================================================
CREATE POLICY "Anyone can view public product images" ON product_images FOR SELECT TO anon, authenticated 
USING (
    EXISTS (
        SELECT 1 FROM products p JOIN branches b ON b.id = p.branch_id 
        WHERE p.id = product_images.product_id AND p.is_active = true AND b.is_active = true
    )
);

CREATE POLICY "Suppliers can view own product images" ON product_images FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND p.supplier_id = (select auth.uid())));

CREATE POLICY "Branch admins can view branch product images" ON product_images FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND (select is_branch_admin(p.branch_id))));

CREATE POLICY "Super admins can view all product images" ON product_images FOR SELECT TO authenticated 
USING ((select is_super_admin()));

CREATE POLICY "Suppliers can insert own product images" ON product_images FOR INSERT TO authenticated WITH CHECK ((select is_supplier_of_product(product_id)));
CREATE POLICY "Suppliers can update own product images" ON product_images FOR UPDATE TO authenticated USING ((select is_supplier_of_product(product_id))) WITH CHECK ((select is_supplier_of_product(product_id)));
CREATE POLICY "Suppliers can delete own product images" ON product_images FOR DELETE TO authenticated USING ((select is_supplier_of_product(product_id)));

CREATE POLICY "Branch admins can insert branch product images" ON product_images FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND (select is_branch_admin(p.branch_id))));
CREATE POLICY "Branch admins can update branch product images" ON product_images FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND (select is_branch_admin(p.branch_id)))) WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND (select is_branch_admin(p.branch_id))));
CREATE POLICY "Branch admins can delete branch product images" ON product_images FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND (select is_branch_admin(p.branch_id))));

CREATE POLICY "Super admins can insert product images" ON product_images FOR INSERT TO authenticated WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can update product images" ON product_images FOR UPDATE TO authenticated USING ((select is_super_admin())) WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can delete product images" ON product_images FOR DELETE TO authenticated USING ((select is_super_admin()));

-- ============================================================================
-- 8. Pickup Slots
-- ============================================================================
CREATE POLICY "Anyone can view public pickup slots" ON pickup_slots FOR SELECT TO anon, authenticated 
USING (
    start_at > now() AND EXISTS (SELECT 1 FROM branches b WHERE b.id = pickup_slots.branch_id AND b.is_active = true)
);

CREATE POLICY "Branch and super admins can view all pickup slots" ON pickup_slots FOR SELECT TO authenticated 
USING ((select is_super_admin()) OR (select is_branch_admin(branch_id)));

CREATE POLICY "Branch admins can insert pickup slots" ON pickup_slots FOR INSERT TO authenticated WITH CHECK ((select is_branch_admin(branch_id)));
CREATE POLICY "Branch admins can update pickup slots" ON pickup_slots FOR UPDATE TO authenticated USING ((select is_branch_admin(branch_id))) WITH CHECK ((select is_branch_admin(branch_id)));
CREATE POLICY "Branch admins can delete pickup slots" ON pickup_slots FOR DELETE TO authenticated USING ((select is_branch_admin(branch_id)));

CREATE POLICY "Super admins can insert pickup slots" ON pickup_slots FOR INSERT TO authenticated WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can update pickup slots" ON pickup_slots FOR UPDATE TO authenticated USING ((select is_super_admin())) WITH CHECK ((select is_super_admin()));
CREATE POLICY "Super admins can delete pickup slots" ON pickup_slots FOR DELETE TO authenticated USING ((select is_super_admin()));

-- ============================================================================
-- 9. Orders
-- NO INSERT, UPDATE, or DELETE policies for normal clients.
-- Creation handled by checkout_order()
-- Updates handled by verify_payment() and update_order_status()
-- ============================================================================
CREATE POLICY "Buyers can view own orders" ON orders FOR SELECT TO authenticated USING (buyer_id = (select auth.uid()));
CREATE POLICY "Suppliers can view orders containing their products" ON orders FOR SELECT TO authenticated USING ((select is_supplier_of_order(id)));
CREATE POLICY "Branch and super admins can view orders" ON orders FOR SELECT TO authenticated USING ((select is_super_admin()) OR (select is_branch_admin(branch_id)));

-- ============================================================================
-- 10. Order Items
-- NO INSERT, UPDATE, or DELETE policies.
-- ============================================================================
CREATE POLICY "Buyers can view own order items" ON order_items FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND buyer_id = (select auth.uid()))
);
CREATE POLICY "Suppliers can view own order items" ON order_items FOR SELECT TO authenticated USING (
    (select is_supplier_of_product(product_id)) OR EXISTS (SELECT 1 FROM products p WHERE p.id = order_items.product_id AND p.supplier_id = (select auth.uid()))
);
CREATE POLICY "Branch and super admins can view order items" ON order_items FOR SELECT TO authenticated USING (
    (select is_super_admin()) OR (select is_branch_admin(branch_id))
);

-- ============================================================================
-- 11. Payment Proofs
-- NO INSERT, UPDATE, or DELETE policies.
-- ============================================================================
CREATE POLICY "Buyers can view own payment proofs" ON payment_proofs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND buyer_id = (select auth.uid()))
);
CREATE POLICY "Branch and super admins can view payment proofs" ON payment_proofs FOR SELECT TO authenticated USING (
    (select is_super_admin()) OR EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (select is_branch_admin(branch_id)))
);

-- ============================================================================
-- 12. Audit Logs
-- NO INSERT, UPDATE, or DELETE policies.
-- ============================================================================
CREATE POLICY "Super admins can view all audit logs" ON audit_logs FOR SELECT TO authenticated USING ((select is_super_admin()));
CREATE POLICY "Branch admins can view audit logs for their branch" ON audit_logs FOR SELECT TO authenticated USING (
    (select is_branch_admin(branch_id))
);
