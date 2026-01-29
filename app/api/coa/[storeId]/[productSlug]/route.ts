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
  { params }: { params: { storeId: string; productSlug: string } }
) {
  try {
    const { storeId, productSlug } = params

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
        const product = doc.products
        const productSlugLower = product.slug?.toLowerCase()
        const productNameLower = product.name?.toLowerCase()

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

    // Only use fallback if we have a reasonable match (score > 50)
    // OR if the productSlug looks like a legacy document ID (UUID format)
    const isLegacyId = /^[a-f0-9-]{36}$/.test(productSlug)

    if (!bestMatch || (matchScore < 50 && !isLegacyId)) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    const coa = bestMatch

    return NextResponse.json({ data: coa })
  } catch (error: any) {
    console.error('Error fetching COA:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
