import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

  return NextResponse.next()
}

export const config = {
  matcher: '/coa/:path*',
}
