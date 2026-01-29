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

      // Normalize the store identifier - replace underscores with spaces
      const normalizedIdentifier = storeId.replace(/_/g, ' ')
      console.log(`[COA] Normalized identifier: "${normalizedIdentifier}"`)

      // Try multiple lookups: slug exact, name exact, name ilike
      let store = null

      // Try 1: Exact slug match (case-insensitive)
      const { data: slugMatches } = await supabase
        .from('stores')
        .select('id, store_name, slug')
        .ilike('slug', storeId)
        .limit(1)

      if (slugMatches && slugMatches.length > 0) {
        store = slugMatches[0]
        console.log(`[COA] Found via slug match: ${store.store_name}`)
      }

      // Try 2: Exact store name match (case-insensitive)
      if (!store) {
        const { data: nameMatches } = await supabase
          .from('stores')
          .select('id, store_name, slug')
          .ilike('store_name', normalizedIdentifier)
          .limit(1)

        if (nameMatches && nameMatches.length > 0) {
          store = nameMatches[0]
          console.log(`[COA] Found via name match: ${store.store_name}`)
        }
      }

      // Try 3: Partial name match (case-insensitive) - search for stores where name contains identifier or vice versa
      if (!store) {
        const { data: partialMatches } = await supabase
          .from('stores')
          .select('id, store_name, slug')

        if (partialMatches && partialMatches.length > 0) {
          const normalizedLower = normalizedIdentifier.toLowerCase()
          store = partialMatches.find((s: any) => {
            const storeName = s.store_name?.toLowerCase() || ''
            // Check if identifier contains store name OR store name contains identifier
            return storeName && (normalizedLower.includes(storeName) || storeName.includes(normalizedLower))
          })

          if (store) {
            console.log(`[COA] Found via partial match: ${store.store_name}`)
          }
        }
      }

      if (store) {
        console.log(`[COA] Resolved "${storeId}" to store ID: ${store.id}`)
        storeId = store.id
      } else {
        console.log(`[COA] No matching store found for "${storeId}"`)
        return NextResponse.json({ error: `Store not found: ${storeId}` }, { status: 404 })
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
