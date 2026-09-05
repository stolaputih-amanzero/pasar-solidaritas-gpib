-- 001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE member_role AS ENUM ('buyer', 'supplier', 'branch_admin');
CREATE TYPE order_status AS ENUM ('pending_payment', 'confirmed', 'processing', 'ready_for_pickup', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected');

-- SHARED TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION set_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TABLES

-- Branches
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Branch Members
CREATE TABLE branch_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role member_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Strict Tenant Boundary: 1 User = 1 Role per Branch.
    UNIQUE(branch_id, profile_id) 
);

-- Global Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supplier Profiles
CREATE TABLE supplier_profiles (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    business_name TEXT,
    story TEXT,
    quote TEXT,
    cover_image_path TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_supplier_profiles_updated_at BEFORE UPDATE ON supplier_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    cover_image_path TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Changed to RESTRICT so removing branch membership safely preserves historical products
    FOREIGN KEY (branch_id, supplier_id) REFERENCES branch_members(branch_id, profile_id) ON DELETE RESTRICT,
    UNIQUE(id, branch_id) -- Supports composite FK for order_items
);
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Product Images
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    alt_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pickup Slots
CREATE TABLE pickup_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_at > start_at) -- Ensure valid time range
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    status order_status NOT NULL DEFAULT 'pending_payment',
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    pickup_slot_id UUID REFERENCES pickup_slots(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ, -- Expiry for pending payment
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Composite FK for tenant integrity
    FOREIGN KEY (branch_id, buyer_id) REFERENCES branch_members(branch_id, profile_id) ON DELETE RESTRICT,
    UNIQUE(id, branch_id), -- Supports composite FK for order_items
    -- Invariant: expires_at is only populated during pending_payment
    CONSTRAINT orders_expires_at_check CHECK (
        (status = 'pending_payment' AND expires_at IS NOT NULL) OR
        (status != 'pending_payment' AND expires_at IS NULL)
    )
);
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_time NUMERIC(14,2) NOT NULL CHECK (price_at_time >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce that the product and order belong to the same branch
    FOREIGN KEY (order_id, branch_id) REFERENCES orders(id, branch_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id, branch_id) REFERENCES products(id, branch_id) ON DELETE RESTRICT
);

-- Payment Proofs
CREATE TABLE payment_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    -- Consistency check for payment verification
    CONSTRAINT payment_proofs_verification_check CHECK (
        (status = 'pending' AND verified_by IS NULL AND verified_at IS NULL) OR
        (status IN ('approved', 'rejected') AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
    )
);

-- Ensure a single pending payment proof per order
CREATE UNIQUE INDEX payment_proofs_single_pending ON payment_proofs(order_id) WHERE status = 'pending';

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    changes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
