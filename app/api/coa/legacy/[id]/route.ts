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
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id

    // Look up document by ID to get store_id and product info
    const { data, error } = await supabase
      .from('store_documents')
      .select(`
        id,
        store_id,
        products(name, slug)
      `)
      .eq('id', documentId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Generate product slug from product name if slug doesn't exist
    const product = data.products as any
    let productSlug = product?.slug

    if (!productSlug && product?.name) {
      // Create slug from product name
      productSlug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    }

    if (!productSlug) {
      // Fallback: use document ID as slug
      productSlug = documentId
    }

    return NextResponse.json({
      storeId: data.store_id,
      productSlug: productSlug
    })

  } catch (error: any) {
    console.error('Error in legacy redirect:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
