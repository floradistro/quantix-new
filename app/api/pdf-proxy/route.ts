import { NextRequest, NextResponse } from 'next/server'

// Dynamic route but with browser caching via headers
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }

    // Validate URL is from Supabase storage
    if (!url.startsWith('https://uaednwpxursknmwdeejn.supabase.co/storage/')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the PDF from Supabase
    const response = await fetch(url, {
      next: { revalidate: 86400 } // Cache fetch for 24 hours
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: response.status })
    }

    const pdfBuffer = await response.arrayBuffer()

    // Return PDF with aggressive caching - PDFs are immutable
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    console.error('[PDF Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy PDF', details: error?.message },
      { status: 500 }
    )
  }
}
