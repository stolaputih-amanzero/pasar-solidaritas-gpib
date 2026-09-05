import { createClient } from '@/lib/supabase/server'

export interface SupplierAnalyticsData {
  totalRevenue: number
  totalUnits: number
  totalOrders: number
  salesByDay: Array<{ date: string; omset: number; unit: number }>
  topProducts: Array<{ name: string; revenue: number; units: number }>
}

export async function getSupplierAnalytics(
  supplierId: string,
  branchId: string
): Promise<SupplierAnalyticsData> {
  const supabase = await createClient()

  // 1. Fetch products owned by this supplier in this branch
  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .eq('supplier_id', supplierId)
    .eq('branch_id', branchId)

  if (!products || products.length === 0) {
    return {
      totalRevenue: 0,
      totalUnits: 0,
      totalOrders: 0,
      salesByDay: [],
      topProducts: [],
    }
  }

  const productIds = products.map((p) => p.id)
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]))

  // 2. Fetch order items for these products with order status and timestamp
  const { data: items } = await supabase
    .from('order_items')
    .select(`
      order_id,
      product_id,
      quantity,
      price_at_time,
      orders (
        id,
        status,
        created_at
      )
    `)
    .in('product_id', productIds)

  if (!items || items.length === 0) {
    return {
      totalRevenue: 0,
      totalUnits: 0,
      totalOrders: 0,
      salesByDay: [],
      topProducts: [],
    }
  }

  // Filter completed/confirmed orders
  const validStatus = ['confirmed', 'processing', 'ready_for_pickup', 'completed']
  const validItems = items.filter((item: any) => {
    const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
    return order && validStatus.includes(order.status)
  })

  // 3. Compute Metrics
  let totalRevenue = 0
  let totalUnits = 0
  const orderIdSet = new Set<string>()
  const prodStats: Record<string, { name: string; revenue: number; units: number }> = {}

  // Initialize last 14 days
  const salesByDayMap: Record<string, { omset: number; unit: number }> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    salesByDayMap[key] = { omset: 0, unit: 0 }
  }

  validItems.forEach((item: any) => {
    const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
    const qty = Number(item.quantity) || 0
    const price = Number(item.price_at_time) || 0
    const lineTotal = qty * price

    totalRevenue += lineTotal
    totalUnits += qty
    if (order?.id) orderIdSet.add(order.id)

    // Daily breakdown
    if (order?.created_at) {
      const dayKey = order.created_at.slice(0, 10)
      if (salesByDayMap[dayKey]) {
        salesByDayMap[dayKey].omset += lineTotal
        salesByDayMap[dayKey].unit += qty
      }
    }

    // Top products
    const pId = item.product_id
    const pName = productMap[pId] || 'Produk Jemaat'
    if (!prodStats[pId]) {
      prodStats[pId] = { name: pName, revenue: 0, units: 0 }
    }
    prodStats[pId].revenue += lineTotal
    prodStats[pId].units += qty
  })

  const salesByDay = Object.entries(salesByDayMap).map(([date, val]) => ({
    date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    ...val,
  }))

  const topProducts = Object.values(prodStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return {
    totalRevenue,
    totalUnits,
    totalOrders: orderIdSet.size,
    salesByDay,
    topProducts,
  }
}
