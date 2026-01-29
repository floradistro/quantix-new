import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle legacy COA URLs: /coa/{documentId} -> /coa/{storeId}/{productSlug}
  const legacyCoaMatch = pathname.match(/^\/coa\/([a-f0-9-]{36})$/)

  if (legacyCoaMatch) {
    const documentId = legacyCoaMatch[1]

    try {
      // Fetch the redirect info from the API
      const apiUrl = new URL(`/api/coa/legacy/${documentId}`, request.url)
      const response = await fetch(apiUrl.toString())

      if (response.ok) {
        const { storeId, productSlug } = await response.json()
        const newUrl = new URL(`/coa/${storeId}/${productSlug}`, request.url)
        return NextResponse.redirect(newUrl, 308) // Permanent redirect
      }
    } catch (error) {
      console.error('Error in legacy COA redirect:', error)
    }
  }

  // Handle store name/slug format: /coa/{storeName}/{productSlug} -> /coa/{storeId}/{productSlug}
  const storeNameMatch = pathname.match(/^\/coa\/([^\/]+)\/([^\/]+)$/)

  if (storeNameMatch) {
    const [, storeIdentifier, productSlug] = storeNameMatch

    // Check if it's NOT already a UUID (store ID)
    const isUuid = /^[a-f0-9-]{36}$/i.test(storeIdentifier)

    if (!isUuid) {
      try {
        // Look up store by name or slug
        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .or(`store_name.ilike.${storeIdentifier.replace(/_/g, ' ')},slug.eq.${storeIdentifier}`)
          .single()

        if (store) {
          const newUrl = new URL(`/coa/${store.id}/${productSlug}`, request.url)
          return NextResponse.redirect(newUrl, 308) // Permanent redirect
        }
      } catch (error) {
        console.error('Error in store name COA redirect:', error)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/coa/:path*',
}
