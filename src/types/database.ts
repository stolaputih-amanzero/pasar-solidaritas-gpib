export type MemberRole = 'buyer' | 'supplier' | 'branch_admin'

export type OrderStatus = 
  | 'pending_payment' 
  | 'confirmed' 
  | 'processing' 
  | 'ready_for_pickup' 
  | 'completed' 
  | 'cancelled'

export type PaymentStatus = 'pending' | 'approved' | 'rejected'

export interface Branch {
  id: string
  name: string
  slug: string
  address?: string | null
  coordinates?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  is_super_admin: boolean
  created_at: string
  updated_at: string
}

export interface BranchMember {
  id: string
  branch_id: string
  profile_id: string
  role: MemberRole
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface SupplierProfile {
  profile_id: string
  display_name: string
  business_name: string | null
  story: string | null
  quote: string | null
  cover_image_path: string | null
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  branch_id: string
  supplier_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  stock: number
  cover_image_path: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  categories?: Category | null
  profiles?: Profile | null
  supplier_profiles?: SupplierProfile | null
  product_images?: ProductImage[]
}

export interface ProductImage {
  id: string
  product_id: string
  storage_path: string
  sort_order: number
  alt_text: string | null
  created_at: string
}

export interface PickupSlot {
  id: string
  branch_id: string
  start_at: string
  end_at: string
  capacity: number
  created_at: string
}

export interface Order {
  id: string
  branch_id: string
  buyer_id: string
  status: OrderStatus
  total_amount: number
  pickup_slot_id: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  buyer?: Profile | null
  pickup_slots?: PickupSlot | null
  order_items?: OrderItem[]
  payment_proofs?: PaymentProof[]
}

export interface OrderItem {
  id: string
  order_id: string
  branch_id: string
  product_id: string
  quantity: number
  price_at_time: number
  created_at: string
  // Joined fields
  products?: Product | null
}

export interface PaymentProof {
  id: string
  order_id: string
  file_path: string
  status: PaymentStatus
  uploaded_at: string
  verified_by: string | null
  verified_at: string | null
}

export interface AuditLog {
  id: string
  branch_id: string | null
  table_name: string
  record_id: string
  action: string
  actor_id: string | null
  changes: Record<string, any> | null
  created_at: string
}
