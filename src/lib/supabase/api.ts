import { supabase } from './client'
import { OrderStatus, PaymentStatus } from '@/types/database'

export const DEFAULT_BRANCH_ID = '11111111-1111-1111-1111-111111111111'

/**
 * Ensures the authenticated user has an active membership in the branch.
 * If not, attempts to register them as a buyer.
 */
export async function ensureBranchMember(branchId: string, role: 'buyer' | 'supplier' = 'buyer') {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User is not authenticated')

  const { data: existing } = await supabase
    .from('branch_members')
    .select('id, role, is_active')
    .eq('branch_id', branchId)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!existing) {
    const { error } = await supabase
      .from('branch_members')
      .insert({
        branch_id: branchId,
        profile_id: user.id,
        role: role,
        is_active: true
      })
    if (error) {
      console.warn('Unable to automatically create branch membership:', error.message)
    }
  } else if (!existing.is_active) {
    throw new Error('Keanggotaan Anda di cabang ini sedang tidak aktif.')
  }
}

/**
 * Creates an order atomically using the checkout_order() stored procedure.
 */
export async function checkoutOrder(params: {
  branchId: string
  pickupSlotId: string
  items: { product_id: string; quantity: number }[]
}): Promise<string> {
  const { data, error } = await supabase.rpc('checkout_order', {
    p_branch_id: params.branchId,
    p_pickup_slot_id: params.pickupSlotId,
    p_items: params.items
  })

  if (error) {
    throw error
  }

  return data as string
}

/**
 * Submits payment proof file path for an order using submit_payment_proof() stored procedure.
 */
export async function submitPaymentProof(params: {
  orderId: string
  filePath: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_payment_proof', {
    p_order_id: params.orderId,
    p_file_path: params.filePath
  })

  if (error) {
    throw error
  }

  return data as string
}

/**
 * Admin verifies payment proof using verify_payment() stored procedure.
 */
export async function verifyPayment(params: {
  proofId: string
  newStatus: 'approved' | 'rejected'
}): Promise<void> {
  const { error } = await supabase.rpc('verify_payment', {
    p_proof_id: params.proofId,
    p_new_status: params.newStatus
  })

  if (error) {
    throw error
  }
}

/**
 * Admin updates order status according to the finite state machine transitions.
 */
export async function updateOrderStatus(params: {
  orderId: string
  newStatus: OrderStatus
}): Promise<void> {
  const { error } = await supabase.rpc('update_order_status', {
    p_order_id: params.orderId,
    p_new_status: params.newStatus
  })

  if (error) {
    throw error
  }
}
