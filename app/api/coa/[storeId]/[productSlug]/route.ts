import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; productSlug: string }> }
) {
  try {
    const resolvedParams = await params
    let { storeId, productSlug } = resolvedParams

    // Check if storeId is NOT a UUID - if so, look up the store
    const isUuid = /^[a-f0-9-]{36}$/i.test(storeId)

    if (!isUuid) {
      console.log(`[COA] Looking up store by name/slug: "${storeId}"`)

      // Normalize the store identifier
      const normalizedIdentifier = storeId.replace(/_/g, ' ').toLowerCase()
      console.log(`[COA] Normalized identifier: "${normalizedIdentifier}"`)

      // Look up store by name or slug
      const { data: stores, error: storeError } = await supabase
        .from('stores')
        .select('id, store_name, slug')

      if (storeError) {
        console.error('[COA] Error fetching stores:', storeError)
        return NextResponse.json({ error: 'Error looking up store' }, { status: 500 })
      }

      console.log(`[COA] Found ${stores?.length || 0} stores`)

      if (stores && stores.length > 0) {
        // Find best match
        const store = stores.find((s: any) => {
          const storeName = s.store_name?.toLowerCase() || ''
          const storeSlug = s.slug?.toLowerCase() || ''
          const identifier = normalizedIdentifier

          console.log(`[COA] Checking store: "${s.store_name}" (slug: "${s.slug}")`)

          // Exact matches
          if (storeName === identifier || storeSlug === identifier) {
            console.log(`[COA] Exact match found!`)
            return true
          }

          // Partial matches
          if (storeName && identifier.includes(storeName)) {
            console.log(`[COA] Partial match: identifier contains store name`)
            return true
          }
          if (storeName && storeName.includes(identifier)) {
            console.log(`[COA] Partial match: store name contains identifier`)
            return true
          }

          // Slug match
          if (storeSlug === storeId.toLowerCase()) {
            console.log(`[COA] Slug match found!`)
            return true
          }

          return false
        })

        if (store) {
          console.log(`[COA] Resolved "${storeId}" to store ID: ${store.id}`)
          storeId = store.id
        } else {
          console.log(`[COA] No matching store found for "${storeId}"`)
          return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }
      } else {
        console.log('[COA] No stores in database')
        return NextResponse.json({ error: 'No stores available' }, { status: 404 })
      }
    }

    // Query with service role to bypass RLS
    const { data, error } = await supabase
      .from('store_documents')
      .select(`
        id,
        document_name,
        file_url,
        created_at,
        store_id,
        metadata,
        thumbnail_url,
        product_id,
        stores(store_name, slug),
        products(name, slug)
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    // Find best match by product slug, name, or document name
    const normalizedSlug = productSlug.replace(/_/g, ' ').toLowerCase()
    const searchTerms = normalizedSlug.split(' ').filter(t => t.length > 2)

    let bestMatch = null
    let matchScore = 0

    for (const doc of data) {
      let score = 0

      // Exact matches (highest priority)
      if (doc.products) {
        const product = doc.products as any
        const productSlugLower = product?.slug?.toLowerCase()
        const productNameLower = product?.name?.toLowerCase()

        if (productSlugLower === productSlug.toLowerCase()) {
          score = 100 // Perfect slug match
        } else if (productNameLower === normalizedSlug) {
          score = 90 // Perfect name match
        } else if (productNameLower?.includes(normalizedSlug)) {
          score = 70 // Partial name match
        } else if (searchTerms.length >= 2 && searchTerms.every(term => productNameLower?.includes(term))) {
          score = 60 // All search terms match
        }
      }

      // Try document name match (for legacy COAs without product_id)
      const docNameLower = doc.document_name?.toLowerCase()
      if (score === 0) {
        if (docNameLower === normalizedSlug) {
          score = 85 // Perfect document name match
        } else if (docNameLower?.includes(normalizedSlug)) {
          score = 65 // Partial document name match
        } else if (searchTerms.length >= 2 && searchTerms.every(term => docNameLower?.includes(term))) {
          score = 55 // All search terms in document name
        }
      }

      if (score > matchScore) {
        matchScore = score
        bestMatch = doc
      }
    }

    console.log(`[COA Matching] Product slug: "${productSlug}"`)
    console.log(`[COA Matching] Best match score: ${matchScore}`)
    console.log(`[COA Matching] Best match: ${bestMatch?.document_name || 'none'}`)
    console.log(`[COA Matching] Total documents searched: ${data.length}`)

    // Only return a match if we have a good score (> 50)
    // OR if the productSlug looks like a legacy document ID (UUID format)
    const isLegacyId = /^[a-f0-9-]{36}$/.test(productSlug)

    if (!bestMatch || matchScore === 0) {
      console.log(`[COA Matching] No match found (score: ${matchScore})`)
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    if (matchScore < 50 && !isLegacyId) {
      console.log(`[COA Matching] Match score too low: ${matchScore}`)
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    const coa = bestMatch
    console.log(`[COA Matching] Returning: ${coa.document_name} (score: ${matchScore})`)

    return NextResponse.json({ data: coa })
  } catch (error: any) {
    console.error('[COA] Error fetching COA:', error)
    console.error('[COA] Error message:', error?.message)
    console.error('[COA] Error stack:', error?.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
