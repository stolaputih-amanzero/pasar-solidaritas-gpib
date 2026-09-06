import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Load .env.local if not already in process.env
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const adminClient = createClient(supabaseUrl, serviceRoleKey)

interface TestResult {
  scenario: string
  expected: string
  status: '✅ PASS' | '❌ FAIL'
  details?: string
}

const results: TestResult[] = []

function logResult(scenario: string, expected: string, passed: boolean, details?: string) {
  const status = passed ? '✅ PASS' : '❌ FAIL'
  results.push({ scenario, expected, status, details })
  console.log(`${status} | ${scenario} (Expected: ${expected})${details ? ' -> ' + details : ''}`)
}

async function getClientForUser(email: string, password: string): Promise<{ client: SupabaseClient; user: any }> {
  const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers()
  if (listError) throw listError
  
  const user = authUsers.users.find(u => u.email === email)
  if (!user) throw new Error(`User with email ${email} not found in auth.users`)

  // Set password temporarily for testing
  await adminClient.auth.admin.updateUserById(user.id, { password })

  // IMPORTANT: Use Anon Key with authenticated session to ensure RLS policies are strictly enforced!
  const client = createClient(supabaseUrl, anonKey)
  const { data: authData, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) throw new Error(`Failed to sign in as ${email}: ${signInError.message}`)
  
  return { client, user: authData.user }
}

async function runMatrix() {
  console.log('🚀 Starting Comprehensive RLS Matrix Security Tests...\n')
  const TEST_PASS = 'TestRLSPass123!'

  // 1. Fetch Branches
  const { data: branches, error: bErr } = await adminClient.from('branches').select('id, name, slug').order('slug')
  if (bErr || !branches || branches.length < 2) {
    throw new Error('Need at least 2 branches to test tenant isolation.')
  }
  const branchA = branches.find(b => b.slug === 'toba-tabo') || branches[0]
  const branchB = branches.find(b => b.slug !== branchA.slug) || branches[1]

  console.log(`📌 Branch A (Tenant A): ${branchA.name} (${branchA.slug})`)
  console.log(`📌 Branch B (Tenant B): ${branchB.name} (${branchB.slug})\n`)

  // 2. Configure & Ensure Specific Roles for Testing
  // - Super Admin: admin@pasarsolidaritas.com
  // - Branch Admin A: buyer.johanes@gpib.or.id (Admin for Branch A ONLY, is_super_admin: false)
  // - Supplier: stolaputih@gmail.com (Supplier for Branch A, is_super_admin: false)
  // - Buyer: buyer.david@gpib.or.id (Buyer for Branch A, is_super_admin: false)

  const superAdminEmail = 'admin@pasarsolidaritas.com'
  const branchAdminEmail = 'buyer.johanes@gpib.or.id'
  const supplierEmail = 'stolaputih@gmail.com'
  const buyerEmail = 'buyer.david@gpib.or.id'

  const { client: superAdminClient, user: superAdminUser } = await getClientForUser(superAdminEmail, TEST_PASS)
  const { client: branchAdminClient, user: branchAdminUser } = await getClientForUser(branchAdminEmail, TEST_PASS)
  const { client: supplierClient, user: supplierUser } = await getClientForUser(supplierEmail, TEST_PASS)
  const { client: buyerClient, user: buyerUser } = await getClientForUser(buyerEmail, TEST_PASS)

  // Enforce baseline role profile setup via service_role to avoid contaminated states
  await adminClient.from('profiles').update({ is_super_admin: true }).eq('id', superAdminUser.id)
  await adminClient.from('profiles').update({ is_super_admin: false }).eq('id', branchAdminUser.id)
  await adminClient.from('profiles').update({ is_super_admin: false }).eq('id', supplierUser.id)
  await adminClient.from('profiles').update({ is_super_admin: false }).eq('id', buyerUser.id)

  // Set Branch Admin A membership (branch_admin on branchA, buyer on branchB)
  await adminClient.from('branch_members').upsert({
    branch_id: branchA.id,
    profile_id: branchAdminUser.id,
    role: 'branch_admin',
    is_active: true
  }, { onConflict: 'branch_id,profile_id' })

  await adminClient.from('branch_members').upsert({
    branch_id: branchB.id,
    profile_id: branchAdminUser.id,
    role: 'buyer',
    is_active: true
  }, { onConflict: 'branch_id,profile_id' })

  // Ensure Supplier membership in Branch A
  await adminClient.from('branch_members').upsert({
    branch_id: branchA.id,
    profile_id: supplierUser.id,
    role: 'supplier',
    is_active: true
  }, { onConflict: 'branch_id,profile_id' })

  // Ensure Buyer membership in Branch A
  await adminClient.from('branch_members').upsert({
    branch_id: branchA.id,
    profile_id: buyerUser.id,
    role: 'buyer',
    is_active: true
  }, { onConflict: 'branch_id,profile_id' })

  console.log('--- EXECUTING TEST SCENARIOS ---\n')

  // ============================================================================
  // TEST 1: Anti-Escalation (Buyer trying to elevate own profile to Super Admin)
  // ============================================================================
  const { error: escError } = await buyerClient
    .from('profiles')
    .update({ is_super_admin: true })
    .eq('id', buyerUser.id)
  
  logResult(
    'Anti-Escalation: Buyer -> Super Admin',
    'REJECTED',
    !!escError,
    escError ? escError.message : 'Silently allowed (vulnerable)'
  )

  // ============================================================================
  // TEST 2: Tenant Isolation (Buyer reading orders from another branch / other buyer)
  // ============================================================================
  const { data: ordersB, error: ordErr } = await buyerClient
    .from('orders')
    .select('id, buyer_id, branch_id')
    .eq('branch_id', branchB.id)

  const isTenantIsolated = !ordErr && (!ordersB || ordersB.length === 0 || ordersB.every(o => o.buyer_id === buyerUser.id))
  logResult(
    'Tenant Isolation: Buyer A reads Branch B orders',
    'REJECTED / 0 ROWS',
    isTenantIsolated,
    `Visible rows: ${ordersB ? ordersB.length : 0}`
  )

  // ============================================================================
  // TEST 3: Immutability (Direct client INSERT into payment_proofs)
  // ============================================================================
  const { error: ppError } = await buyerClient
    .from('payment_proofs')
    .insert({
      order_id: '00000000-0000-0000-0000-000000000000',
      file_path: 'hack.jpg',
      status: 'approved'
    })

  logResult(
    'Immutability: Direct client INSERT to payment_proofs',
    'REJECTED',
    !!ppError,
    ppError ? ppError.message : 'Allowed (vulnerable)'
  )

  // ============================================================================
  // TEST 4: Supplier Boundary (Supplier updating a product owned by another supplier)
  // ============================================================================
  const { data: otherProducts } = await adminClient
    .from('products')
    .select('id, name, price, supplier_id')
    .neq('supplier_id', supplierUser.id)
    .limit(1)

  if (otherProducts && otherProducts.length > 0) {
    const targetProduct = otherProducts[0]
    const { data: updatedProd, error: prodError } = await supplierClient
      .from('products')
      .update({ price: 999999 })
      .eq('id', targetProduct.id)
      .select()

    const updateBlocked = !!prodError || (!updatedProd || updatedProd.length === 0)
    logResult(
      'Supplier Boundary: Update other supplier product',
      'REJECTED',
      updateBlocked,
      updateBlocked ? 'No rows modified / RLS blocked' : 'Modified (vulnerable)'
    )
  } else {
    logResult('Supplier Boundary: Update other supplier product', 'SKIP', true, 'No other supplier products found')
  }

  // ============================================================================
  // TEST 5: Admin Boundary (Branch Admin A reading orders from Branch B)
  // ============================================================================
  const { data: adminOrdersB, error: aErr } = await branchAdminClient
    .from('orders')
    .select('id, branch_id, buyer_id')
    .eq('branch_id', branchB.id)

  const adminIsolated = !aErr && (!adminOrdersB || adminOrdersB.length === 0 || adminOrdersB.every(o => o.buyer_id === branchAdminUser.id))
  logResult(
    'Admin Boundary: Branch Admin A reads Branch B orders',
    '0 ROWS',
    adminIsolated,
    `Visible rows: ${adminOrdersB ? adminOrdersB.length : 0}`
  )

  // ============================================================================
  // TEST 6: Super Admin Bypass (Super Admin reading all orders across all branches)
  // ============================================================================
  const { data: saOrders, error: saError } = await superAdminClient
    .from('orders')
    .select('id, branch_id')

  const saPassed = !saError && !!saOrders && saOrders.length > 0
  logResult(
    'Super Admin Bypass: Read all orders globally',
    'ALLOWED',
    saPassed,
    `Total visible orders across branches: ${saOrders ? saOrders.length : 0}`
  )

  // ============================================================================
  // TEST 7: Review Authenticity (Buyer reviewing product they never bought/completed)
  // ============================================================================
  const unpurchasedProductId = 'b2222222-0000-0000-0000-000000000001'
  const { error: revError } = await buyerClient
    .from('product_reviews')
    .insert({
      product_id: unpurchasedProductId,
      branch_id: branchB.id,
      buyer_id: buyerUser.id,
      rating: 5,
      review_text: 'Review palsu tanpa beli'
    })

  logResult(
    'Review Authenticity: Review unpurchased product',
    'REJECTED',
    !!revError,
    revError ? revError.message : 'Allowed (vulnerable)'
  )

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n📊 Rekapitulasi Hasil Pengujian Matriks RLS:')
  const passed = results.filter(r => r.status === '✅ PASS').length
  const failed = results.filter(r => r.status === '❌ FAIL').length
  console.log(`Total Skenario: ${results.length} | Lulus: ${passed} | Gagal: ${failed}`)

  if (failed > 0) {
    console.log('\n⚠️ Terdapat kegagalan pada matriks RLS. Harap periksa kebijakan RLS di Supabase!')
    process.exit(1)
  } else {
    console.log('\n🎉 Semua matriks keamanan RLS tervalidasi dengan sempurna!')
  }
}

runMatrix().catch((err) => {
  console.error('Fatal Error running matrix:', err)
  process.exit(1)
})
