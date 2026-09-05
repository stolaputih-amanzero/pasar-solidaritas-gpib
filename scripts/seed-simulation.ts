import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seed() {
  console.log('🌱 Starting comprehensive simulation seed...')

  // 1. Ensure Demo Users
  console.log('1. Configuring demo users...')
  const demoUsers = [
    { email: 'buyer.david@gpib.or.id', name: 'David Simanjuntak', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400' },
    { email: 'buyer.ruth@gpib.or.id', name: 'Ruth Hutapea', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400' },
    { email: 'buyer.johanes@gpib.or.id', name: 'Pnt. Johanes Latupeirissa', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400' },
    { email: 'buyer.grace@gpib.or.id', name: 'Dkn. Grace Manoppo', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400' },
  ]

  const userIds: Record<string, string> = {
    stola: '3f9a8027-fb0d-4710-97be-e3c14043c7bd',
    admin: '3469e6b1-103b-4683-ac3b-db30e99ca570',
    martha: '00000000-0000-0000-0000-000000000001'
  }

  // Update existing profiles with better names and avatars
  await supabase.from('profiles').update({
    full_name: 'Stola P. (Mitra UMKM)',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
  }).eq('id', userIds.stola)

  for (const u of demoUsers) {
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const found = existingUser?.users?.find(x => x.email === u.email)
    let uid = found?.id
    if (!uid) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { full_name: u.name }
      })
      if (error) console.error(`Error creating ${u.email}:`, error.message)
      uid = created?.user?.id
    }
    if (uid) {
      userIds[u.email] = uid
      await supabase.from('profiles').upsert({
        id: uid,
        full_name: u.name,
        avatar_url: u.avatar,
        phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
        is_super_admin: false
      })
    }
  }

  // 2. Branches
  console.log('2. Seeding branches...')
  const branches = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'GPIB Toba Tabo Jakarta',
      slug: 'toba-tabo',
      is_active: true
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'GPIB Immanuel Gambir',
      slug: 'immanuel-jakarta',
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333332',
      name: 'GPIB Paulus Menteng',
      slug: 'paulus-menteng',
      is_active: true
    },
    {
      id: '44444444-4444-4444-4444-444444444442',
      name: 'GPIB Surya Kasih',
      slug: 'surya-kasih',
      is_active: true
    }
  ]

  for (const b of branches) {
    await supabase.from('branches').upsert(b)
  }

  // 3. Branch Members
  console.log('3. Seeding memberships...')
  const allProfileIds = Object.values(userIds)
  for (const b of branches) {
    // Admin role
    await supabase.from('branch_members').upsert({
      branch_id: b.id,
      profile_id: userIds.admin,
      role: 'branch_admin',
      is_active: true
    }, { onConflict: 'branch_id,profile_id' })

    // Stola as supplier
    await supabase.from('branch_members').upsert({
      branch_id: b.id,
      profile_id: userIds.stola,
      role: 'supplier',
      is_active: true
    }, { onConflict: 'branch_id,profile_id' })

    // Martha as supplier
    await supabase.from('branch_members').upsert({
      branch_id: b.id,
      profile_id: userIds.martha,
      role: 'supplier',
      is_active: true
    }, { onConflict: 'branch_id,profile_id' })

    // Others as buyer
    for (const pid of allProfileIds) {
      if (pid !== userIds.admin && pid !== userIds.stola && pid !== userIds.martha) {
        await supabase.from('branch_members').upsert({
          branch_id: b.id,
          profile_id: pid,
          role: 'buyer',
          is_active: true
        }, { onConflict: 'branch_id,profile_id' })
      }
    }
  }

  // 4. Categories
  console.log('4. Seeding categories...')
  const categories = [
    { id: '33333333-3333-3333-3333-333333333333', name: 'Kuliner & Pangan', slug: 'kuliner', is_active: true },
    { id: '44444444-4444-4444-4444-444444444444', name: 'Kriya & Kerajinan', slug: 'kerajinan', is_active: true },
    { id: '55555555-5555-5555-5555-555555555555', name: 'Hasil Bumi Alami', slug: 'hasil-bumi', is_active: true },
    { id: '66666666-6666-6666-6666-666666666661', name: 'Wastra & Tenun', slug: 'wastra', is_active: true },
    { id: '66666666-6666-6666-6666-666666666662', name: 'Herbal & Kesehatan', slug: 'herbal-kesehatan', is_active: true },
    { id: '66666666-6666-6666-6666-666666666663', name: 'Karya Pemuda & POUK', slug: 'karya-pemuda', is_active: true },
  ]
  for (const c of categories) {
    await supabase.from('categories').upsert(c)
  }

  // 5. Pickup Slots
  console.log('5. Seeding pickup slots...')
  const pickupSlots = [
    { id: '66666666-6666-6666-6666-666666666666', branch_id: branches[0].id, start_at: '2026-09-13T01:00:00+00:00', end_at: '2026-09-13T05:00:00+00:00', capacity: 50 },
    { id: '77777777-7777-7777-7777-777777777777', branch_id: branches[0].id, start_at: '2026-09-13T06:00:00+00:00', end_at: '2026-09-13T10:00:00+00:00', capacity: 50 },
    { id: '22222222-1111-1111-1111-111111111111', branch_id: branches[1].id, start_at: '2026-09-13T02:00:00+00:00', end_at: '2026-09-13T06:00:00+00:00', capacity: 40 },
    { id: '33333333-1111-1111-1111-111111111111', branch_id: branches[2].id, start_at: '2026-09-13T03:00:00+00:00', end_at: '2026-09-13T07:00:00+00:00', capacity: 40 },
    { id: '44444444-1111-1111-1111-111111111111', branch_id: branches[3].id, start_at: '2026-09-13T04:00:00+00:00', end_at: '2026-09-13T08:00:00+00:00', capacity: 30 },
  ]
  for (const s of pickupSlots) {
    await supabase.from('pickup_slots').upsert(s)
  }

  // 6. Products
  console.log('6. Seeding products...')
  const products = [
    {
      id: 'c94b8b72-e639-450e-ba2a-486fcebf5cc0',
      branch_id: branches[0].id,
      supplier_id: userIds.stola,
      category_id: categories[0].id,
      name: 'Kopi Arabika Toba Specialty (250g)',
      description: 'Biji kopi arabika pilihan dari ketinggian 1400 mdpl lereng Gunung Sinabung & Danau Toba. Tasting notes: Floral, brown sugar, citrus crisp.',
      price: 85000,
      stock: 45,
      cover_image_path: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=800',
      is_active: true
    },
    {
      id: '4c9821a8-d63a-47b2-b45b-59b953bf37f3',
      branch_id: branches[0].id,
      supplier_id: userIds.stola,
      category_id: categories[3].id,
      name: 'Tenun Ulos Ragidup Sutra Halus',
      description: 'Tenunan tangan asli pengrajin jemaat Toba Tabo. Ditenun selama 3 minggu dengan benang sutra bermutu tinggi, motif melambangkan kehidupan dan berkat.',
      price: 450000,
      stock: 12,
      cover_image_path: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&q=80&w=800',
      is_active: true
    },
    {
      id: 'f431e3c6-1c71-4ebe-90a0-e657c1258318',
      branch_id: branches[0].id,
      supplier_id: userIds.stola,
      category_id: categories[0].id,
      name: 'Sambal Andaliman Nauli (200g)',
      description: 'Sensasi pedas getir khas andaliman Pulau Samosir dengan minyak kelapa asli tanpa bahan pengawet kimiawi.',
      price: 38000,
      stock: 80,
      cover_image_path: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&q=80&w=800',
      is_active: true
    },
    {
      id: 'a1111111-0000-0000-0000-000000000001',
      branch_id: branches[0].id,
      supplier_id: userIds.stola,
      category_id: categories[2].id,
      name: 'Madu Hutan Murni Samosir (500ml)',
      description: 'Madu lebah hutan liar alami dipanen langsung dari hutan kawasan Danau Toba. Kaya enzim dan antibakteri alami untuk menjaga imunitas tubuh.',
      price: 125000,
      stock: 35,
      cover_image_path: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800',
      is_active: true
    },
    {
      id: 'a1111111-0000-0000-0000-000000000002',
      branch_id: branches[0].id,
      supplier_id: userIds.stola,
      category_id: categories[4].id,
      name: 'Minyak Kelapa Murni VCO Dingin (250ml)',
      description: 'Extra Virgin Coconut Oil proses cold-pressed higienis buatan ibu-ibu Pelkat PKP. Bagus untuk kesehatan pencernaan dan perawatan kulit alami.',
      price: 45000,
      stock: 50,
      cover_image_path: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&q=80&w=800',
      is_active: true
    },
    // Branch 2: Immanuel
    {
      id: 'b2222222-0000-0000-0000-000000000001',
      branch_id: branches[1].id,
      supplier_id: userIds.stola,
      category_id: categories[0].id,
      name: 'Nastar Wisman Spesial Paskah (Toples 500g)',
      description: 'Nastar homemade legendaris jemaat GPIB Immanuel. 100% Dutch butter Wijsman dengan selai nanas asli manis asam seimbang.',
      price: 98000,
      stock: 60,
      cover_image_path: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=800',
      is_active: true
    },
    {
      id: 'b2222222-0000-0000-0000-000000000002',
      branch_id: branches[1].id,
      supplier_id: userIds.stola,
      category_id: categories[1].id,
      name: 'Lilin Doa Aromaterapi Kayu Cendana',
      description: 'Handcrafted soy wax candle dibuat oleh pemuda jemaat. Aroma kayu cendana & lavender menenangkan untuk saat teduh dan doa pribadi.',
      price: 65000,
      stock: 40,
      cover_image_path: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=800',
      is_active: true
    },
    // Branch 3: Paulus Menteng
    {
      id: 'c3333333-0000-0000-0000-000000000001',
      branch_id: branches[2].id,
      supplier_id: userIds.stola,
      category_id: categories[3].id,
      name: 'Batik Tulis Corak Kasih Menteng',
      description: 'Kain batik tulis katun primissima motif kontemporer. Pewarnaan alami ramah lingkungan karya perajin senior warga jemaat.',
      price: 320000,
      stock: 15,
      cover_image_path: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&q=80&w=800',
      is_active: true
    },
    {
      id: 'c3333333-0000-0000-0000-000000000002',
      branch_id: branches[2].id,
      supplier_id: userIds.stola,
      category_id: categories[5].id,
      name: 'Totebag Kanvas "Kasih Mempersatukan"',
      description: 'Totebag kanvas tebal 14oz ramah lingkungan karya komisi pemuda. Sablon plastisol awet dengan resleting ykk dan saku dalam.',
      price: 75000,
      stock: 50,
      cover_image_path: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800',
      is_active: true
    }
  ]

  for (const p of products) {
    await supabase.from('products').upsert(p)
  }

  // 7. Promotional Banners
  console.log('7. Seeding promotional banners...')
  const banners = [
    {
      id: 'd1111111-0000-0000-0000-000000000001',
      branch_id: null, // Global
      title: 'Bazar Paskah Solidaritas 2026',
      subtitle: 'Dukung UMKM & hasil bumi jemaat dalam menyambut hari raya kebangkitan dengan harga saling menopang.',
      badge_text: 'WARTA SOLIDARITAS',
      image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1200',
      cta_text: 'Jelajahi Produk',
      cta_link: '/toba-tabo',
      is_active: true,
      sort_order: 1
    },
    {
      id: 'd1111111-0000-0000-0000-000000000002',
      branch_id: branches[0].id, // Toba Tabo
      title: 'Kopi Toba Fest 2026',
      subtitle: 'Festival panen raya kopi arabika single-origin langsung dari kebun petani jemaat kawasan Danau Toba.',
      badge_text: 'FESTIVAL PANEN',
      image_url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=1200',
      cta_text: 'Beli Kopi Segar',
      cta_link: `/toba-tabo/produk/${products[0].id}`,
      is_active: true,
      sort_order: 2
    },
    {
      id: 'd1111111-0000-0000-0000-000000000003',
      branch_id: null, // Global
      title: 'Wastra Nusantara Tenun Kasih',
      subtitle: 'Kain tenun ulos dan songket tangan asli berdayakan ibu-ibu penenun jemaat dengan martabat budaya.',
      badge_text: 'WARISAN BUDAYA',
      image_url: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&q=80&w=1200',
      cta_text: 'Lihat Koleksi',
      cta_link: `/toba-tabo/produk/${products[1].id}`,
      is_active: true,
      sort_order: 3
    },
    {
      id: 'd1111111-0000-0000-0000-000000000004',
      branch_id: branches[1].id, // Immanuel
      title: 'Dapur Immanuel: Kue Paskah Tradisional',
      subtitle: 'Nastar wisman dan kue-kue kering resep turun-temurun Pelkat PKP GPIB Immanuel Jakarta.',
      badge_text: 'KULINER KHAS',
      image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=1200',
      cta_text: 'Pesan Sekarang',
      cta_link: `/immanuel-jakarta/produk/${products[5].id}`,
      is_active: true,
      sort_order: 4
    }
  ]

  for (const bn of banners) {
    await supabase.from('promotional_banners').upsert(bn)
  }

  // 8. Completed Orders for realistic 14-day Supplier Analytics
  console.log('8. Seeding completed orders for Supplier Analytics...')
  const now = new Date()
  const buyers = [
    userIds['buyer.david@gpib.or.id'],
    userIds['buyer.ruth@gpib.or.id'],
    userIds['buyer.johanes@gpib.or.id'],
    userIds['buyer.grace@gpib.or.id']
  ].filter(Boolean)

  // Clear previous sample orders for fresh idempotency
  const { data: existingSeedOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('branch_id', branches[0].id)
    .neq('id', '5cb32881-830b-40f4-9ac3-0d83d848182e') // keep original order

  if (existingSeedOrders && existingSeedOrders.length > 0) {
    await supabase.from('order_items').delete().in('order_id', existingSeedOrders.map(o => o.id))
    await supabase.from('orders').delete().in('id', existingSeedOrders.map(o => o.id))
  }

  // Generate orders across days: 0, 1, 2, 3, 5, 7, 8, 10, 12, 13 days ago
  const orderDays = [0, 1, 2, 3, 5, 7, 8, 10, 12, 13]
  const sampleOrderItems: any[] = []

  for (let i = 0; i < orderDays.length; i++) {
    const daysAgo = orderDays[i]
    const orderDate = new Date(now)
    orderDate.setDate(orderDate.getDate() - daysAgo)
    orderDate.setHours(9 + (i % 8), 15 * (i % 4), 0, 0)

    const buyerId = buyers[i % buyers.length]
    const orderId = `e0000000-0000-0000-0000-00000000000${i + 1}`

    // Choose 1-2 products
    const p1 = products[i % 4]
    const p2 = products[(i + 1) % 4]
    const q1 = (i % 3) + 1
    const q2 = i % 2 === 0 ? 1 : 0
    const totalAmount = (p1.price * q1) + (p2.price * q2)

    await supabase.from('orders').insert({
      id: orderId,
      branch_id: branches[0].id,
      buyer_id: buyerId,
      status: 'completed',
      total_amount: totalAmount,
      pickup_slot_id: pickupSlots[0].id,
      created_at: orderDate.toISOString(),
      updated_at: orderDate.toISOString()
    })

    sampleOrderItems.push({
      order_id: orderId,
      branch_id: branches[0].id,
      product_id: p1.id,
      quantity: q1,
      price_at_time: p1.price,
      created_at: orderDate.toISOString()
    })

    if (q2 > 0) {
      sampleOrderItems.push({
        order_id: orderId,
        branch_id: branches[0].id,
        product_id: p2.id,
        quantity: q2,
        price_at_time: p2.price,
        created_at: orderDate.toISOString()
      })
    }
  }

  for (const item of sampleOrderItems) {
    await supabase.from('order_items').insert(item)
  }

  // 9. Product Reviews & Ratings
  console.log('9. Seeding verified buyer reviews...')
  const reviews = [
    {
      product_id: products[0].id, // Kopi Arabika Toba
      branch_id: branches[0].id,
      buyer_id: userIds['buyer.david@gpib.or.id'],
      rating: 5,
      review_text: 'Kopinya harum luar biasa, acidity-nya pas dan ada hint rasa gula aren yang manis di aftertaste. Pas sekali untuk suguhan kopi darat persekutuan doa subuh. Tuhan memberkati usahanya!',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      product_id: products[0].id, // Kopi Arabika Toba
      branch_id: branches[0].id,
      buyer_id: userIds['buyer.ruth@gpib.or.id'],
      rating: 5,
      review_text: 'Fresh roast! Roasted date tertera jelas di kemasan. Diseduh pakai V60 atau French Press rasanya sangat bersih. Pasti repeat order.',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      product_id: products[1].id, // Tenun Ulos
      branch_id: branches[0].id,
      buyer_id: userIds['buyer.johanes@gpib.or.id'],
      rating: 5,
      review_text: 'Kain tenunnya sangat rapi dan motifnya megah. Ibu saya sangat terharu menerima hadiah ulos ini untuk ibadah ucapan syukur keluarga. Sukses selalu untuk karya warga jemaat.',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      product_id: products[2].id, // Sambal Andaliman
      branch_id: branches[0].id,
      buyer_id: userIds['buyer.grace@gpib.or.id'],
      rating: 5,
      review_text: 'Getir andalimannya nampol dan otentik sekali! Makan pakai ikan mas bakar atau nasi hangat saja sudah luar biasa nikmatnya. Kemasan segel rapat tanpa bocor.',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      product_id: products[3].id, // Madu Hutan Samosir
      branch_id: branches[0].id,
      buyer_id: userIds['buyer.david@gpib.or.id'],
      rating: 4,
      review_text: 'Madu asli tanpa campuran gula, rasa manisnya segar dan ada sedikit aroma bunga hutan. Bagus untuk menjaga stamina.',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  ]

  for (const r of reviews) {
    if (r.buyer_id) {
      await supabase.from('product_reviews').upsert(r, { onConflict: 'product_id,buyer_id' })
    }
  }

  console.log('✅ Simulation seed successfully applied!')
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
