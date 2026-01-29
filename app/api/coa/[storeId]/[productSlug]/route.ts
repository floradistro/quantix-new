import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force Node.js runtime for better compatibility
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storeId: string; productSlug: string }> }
) {
  try {
    const resolvedParams = await context.params
    let { storeId, productSlug } = resolvedParams

    console.log(`[COA v6] Request for storeId: "${storeId}", productSlug: "${productSlug}"`)

    // Create Supabase client inside function to ensure proper initialization
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

    // Check if storeId is NOT a UUID - if so, look up the store
    const isUuid = /^[a-f0-9-]{36}$/i.test(storeId)

    if (!isUuid) {
      console.log(`[COA v6] Looking up store by name/slug: "${storeId}"`)

      try {
        // Legacy QR code mapping for stores whose legal names changed
        const legacyNameMap: Record<string, string> = {
          'Flora_Distribution_Group_LLC': 'Flora Distro',
          'flora_distribution_group_llc': 'Flora Distro',
          'Flora Distribution Group LLC': 'Flora Distro',
        }

        // Check if this is a known legacy name
        let lookupName = storeId
        if (legacyNameMap[storeId]) {
          lookupName = legacyNameMap[storeId]
          console.log(`[COA v6] Mapped legacy name "${storeId}" -> "${lookupName}"`)
        }

        // Normalize the store identifier for matching
        const normalizedIdentifier = lookupName.replace(/_/g, ' ').toLowerCase()
        console.log(`[COA v6] Normalized: "${normalizedIdentifier}"`)

        // Simple approach: get all stores and match (similar to middleware)
        const { data: stores, error: storesError } = await supabase
          .from('stores')
          .select('id, store_name, slug')

        if (storesError) {
          console.error('[COA v6] Supabase error:', storesError)
          throw storesError
        }

        console.log(`[COA v6] Found ${stores?.length || 0} total stores`)

        if (stores && stores.length > 0) {
          // Find best match using same logic as middleware
          const store = stores.find((s: any) => {
            const storeName = s.store_name?.toLowerCase() || ''
            const storeSlug = s.slug?.toLowerCase() || ''

            // Exact matches
            if (storeName === normalizedIdentifier || storeSlug === lookupName.toLowerCase()) {
              console.log(`[COA v6] Exact match: ${s.store_name}`)
              return true
            }

            // Partial matches
            if (storeName && (normalizedIdentifier.includes(storeName) || storeName.includes(normalizedIdentifier))) {
              console.log(`[COA v6] Partial match: ${s.store_name}`)
              return true
            }

            return false
          })

          if (store) {
            console.log(`[COA v6] Resolved to: ${store.store_name} (${store.id})`)
            storeId = store.id
          } else {
            console.log(`[COA v6] No match found`)
            return NextResponse.json({ error: `Store not found: ${storeId}` }, { status: 404 })
          }
        } else {
          console.log('[COA v6] No stores in database')
          return NextResponse.json({ error: 'No stores available' }, { status: 404 })
        }
      } catch (lookupError: any) {
        console.error('[COA v6] Store lookup error:', lookupError)
        console.error('[COA v6] Error details:', JSON.stringify(lookupError))
        return NextResponse.json({
          error: 'Store lookup failed',
          details: lookupError?.message
        }, { status: 500 })
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
        completed_date,
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
