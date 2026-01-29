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
  console.log('[Middleware] Processing:', pathname)

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
      console.log('[Middleware] Non-UUID detected:', storeIdentifier)
      try {
        // Legacy QR code mapping for stores whose legal names changed
        const legacyNameMap: Record<string, string> = {
          'Flora_Distribution_Group_LLC': 'Flora Distro',
          'flora_distribution_group_llc': 'Flora Distro',
          'Flora Distribution Group LLC': 'Flora Distro',
        }

        // Check if this is a known legacy name
        let lookupName = storeIdentifier
        if (legacyNameMap[storeIdentifier]) {
          lookupName = legacyNameMap[storeIdentifier]
          console.log('[Middleware] Mapped legacy name:', storeIdentifier, '->', lookupName)
        }

        // Normalize the store identifier for matching
        const normalizedIdentifier = lookupName.replace(/_/g, ' ').toLowerCase()
        console.log('[Middleware] Normalized:', normalizedIdentifier)

        // Look up store by name or slug with flexible matching
        const { data: stores, error: storesError } = await supabase
          .from('stores')
          .select('id, store_name, slug')

        if (storesError) {
          console.error('[Middleware] Supabase error:', storesError)
          return NextResponse.next()
        }

        console.log('[Middleware] Found stores:', stores?.length)


        if (stores && stores.length > 0) {
          // Find best match
          const store = stores.find((s: any) => {
            const storeName = s.store_name?.toLowerCase() || ''
            const storeSlug = s.slug?.toLowerCase() || ''
            const identifier = normalizedIdentifier

            // Exact matches
            if (storeName === identifier || storeSlug === identifier) return true

            // Partial matches (identifier contains store name or vice versa)
            if (storeName && identifier.includes(storeName)) return true
            if (storeName && storeName.includes(identifier)) return true

            // Slug match
            if (storeSlug === storeIdentifier.toLowerCase()) return true

            return false
          })

          if (store) {
            console.log('[Middleware] Match found! Redirecting to:', store.id)
            const newUrl = new URL(`/coa/${store.id}/${productSlug}`, request.url)
            return NextResponse.redirect(newUrl, 308) // Permanent redirect
          } else {
            console.log('[Middleware] No match found for:', storeIdentifier)
          }
        }
      } catch (error) {
        console.error('[Middleware] Error in store name redirect:', error)
      }
    }
  }

  console.log('[Middleware] Passing through')
  return NextResponse.next()
}

export const config = {
  matcher: '/coa/:path*',
}
