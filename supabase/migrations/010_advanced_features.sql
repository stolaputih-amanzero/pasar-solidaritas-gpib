-- 010_advanced_features.sql

-- ============================================================================
-- 1. PRODUCT REVIEWS & RATINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (branch_id, buyer_id) REFERENCES branch_members(branch_id, profile_id) ON DELETE CASCADE,
    UNIQUE (product_id, buyer_id) -- 1 ulasan per pembeli per produk
);

DROP TRIGGER IF EXISTS set_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER set_product_reviews_updated_at BEFORE UPDATE ON product_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helper: Memastikan buyer pernah menyelesaikan pesanan yang berisi produk ini
CREATE OR REPLACE FUNCTION can_review_product(p_product_id UUID, p_buyer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = p_product_id
          AND o.buyer_id = p_buyer_id
          AND o.status = 'completed'
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION can_review_product FROM public;
GRANT EXECUTE ON FUNCTION can_review_product TO authenticated;
GRANT EXECUTE ON FUNCTION can_review_product TO service_role;

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON product_reviews;
CREATE POLICY "Anyone can view reviews" ON product_reviews FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Verified buyers can insert reviews" ON product_reviews;
CREATE POLICY "Verified buyers can insert reviews" ON product_reviews FOR INSERT TO authenticated
WITH CHECK (
    buyer_id = (select auth.uid())
    AND (select can_review_product(product_id, buyer_id))
);

DROP POLICY IF EXISTS "Buyers can update own reviews" ON product_reviews;
CREATE POLICY "Buyers can update own reviews" ON product_reviews FOR UPDATE TO authenticated
USING (buyer_id = (select auth.uid())) WITH CHECK (buyer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Super admins can delete reviews" ON product_reviews;
CREATE POLICY "Super admins can delete reviews" ON product_reviews FOR DELETE TO authenticated USING ((select is_super_admin()));

-- ============================================================================
-- 2. PROMOTIONAL BANNERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS promotional_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE, -- NULL = Global
    title TEXT NOT NULL,
    subtitle TEXT,
    badge_text TEXT DEFAULT 'Warta Solidaritas',
    image_url TEXT NOT NULL,
    cta_text TEXT DEFAULT 'Lihat Produk',
    cta_link TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE promotional_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active banners" ON promotional_banners;
CREATE POLICY "Anyone can view active banners" ON promotional_banners FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage all banners" ON promotional_banners;
CREATE POLICY "Super admins can manage all banners" ON promotional_banners FOR ALL TO authenticated USING ((select is_super_admin())) WITH CHECK ((select is_super_admin()));

DROP POLICY IF EXISTS "Branch admins can manage branch banners" ON promotional_banners;
CREATE POLICY "Branch admins can manage branch banners" ON promotional_banners FOR ALL TO authenticated
USING (branch_id IS NOT NULL AND (select is_branch_admin(branch_id)))
WITH CHECK (branch_id IS NOT NULL AND (select is_branch_admin(branch_id)));

-- Seed Initial Banners (with idempotency)
INSERT INTO promotional_banners (branch_id, title, subtitle, image_url, cta_link, sort_order)
SELECT NULL, 'Bazar Paskah Solidaritas', 'Dukung UMKM Jemaat dalam menyambut hari raya. Diskon khusus untuk hasil bumi dan kerajinan tangan.', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1200', '/toba-tabo', 1
WHERE NOT EXISTS (SELECT 1 FROM promotional_banners WHERE title = 'Bazar Paskah Solidaritas');

INSERT INTO promotional_banners (branch_id, title, subtitle, image_url, cta_link, sort_order)
SELECT '11111111-1111-1111-1111-111111111111', 'Kopi Toba Fest 2026', 'Festival panen raya kopi arabika dari dataran tinggi Toba. Pre-order sekarang!', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=1200', '/toba-tabo/produk/c94b8b72-e639-450e-ba2a-486fcebf5cc0', 2
WHERE NOT EXISTS (SELECT 1 FROM promotional_banners WHERE title = 'Kopi Toba Fest 2026');
