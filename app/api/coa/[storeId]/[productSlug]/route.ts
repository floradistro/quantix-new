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

    // Find best match by product slug or name
    const normalizedSlug = productSlug.replace(/_/g, ' ')
    const match = data.find((doc: any) => {
      if (!doc.products) return false

      const product = doc.products
      const productSlugLower = product.slug?.toLowerCase()
      const productNameSlug = product.name?.toLowerCase().replace(/\s+/g, '_')
      const searchSlug = productSlug.toLowerCase()
      const searchName = normalizedSlug.toLowerCase()

      return (
        productSlugLower === searchSlug ||
        productNameSlug === searchSlug ||
        product.name?.toLowerCase() === searchName
      )
    })

    const coa = match || data[0] // Fallback to first document for backward compatibility

    return NextResponse.json({ data: coa })
  } catch (error: any) {
    console.error('Error fetching COA:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
