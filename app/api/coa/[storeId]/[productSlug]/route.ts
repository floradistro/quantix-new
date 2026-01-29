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

    const match = data.find((doc: any) => {
      // Try product match first
      if (doc.products) {
        const product = doc.products
        const productSlugLower = product.slug?.toLowerCase()
        const productNameLower = product.name?.toLowerCase()

        if (productSlugLower === productSlug.toLowerCase() ||
            productNameLower === normalizedSlug ||
            productNameLower?.includes(normalizedSlug) ||
            searchTerms.every(term => productNameLower?.includes(term))) {
          return true
        }
      }

      // Try document name match (for legacy COAs without product_id)
      const docNameLower = doc.document_name?.toLowerCase()
      if (docNameLower === normalizedSlug ||
          docNameLower?.includes(normalizedSlug) ||
          searchTerms.every(term => docNameLower?.includes(term))) {
        return true
      }

      return false
    })

    // Fallback: return first document for backward compatibility
    const coa = match || data[0]

    return NextResponse.json({ data: coa })
  } catch (error: any) {
    console.error('Error fetching COA:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
