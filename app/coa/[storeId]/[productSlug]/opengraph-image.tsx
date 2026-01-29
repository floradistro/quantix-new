import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'

export const runtime = 'edge'
export const alt = 'Certificate of Analysis'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({ params }: { params: { storeId: string; productSlug: string } }) {
  try {
    // Fetch COA data
    const { data: coa } = await supabase
      .from('store_documents')
      .select(`
        document_name,
        created_at,
        stores!inner(store_name),
        products!inner(name, slug)
      `)
      .eq('store_id', params.storeId)
      .eq('products.slug', params.productSlug)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const productName = (coa?.products as any)?.name || coa?.document_name || 'Certificate of Analysis'
    const storeName = (coa?.stores as any)?.store_name || 'Quantix Analytics'
    const date = coa?.created_at
      ? new Date(coa.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : ''

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '120px',
              height: '120px',
              borderRadius: '24px',
              background: 'rgba(0, 113, 227, 0.1)',
              marginBottom: '40px',
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke="#0071e3"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="14 2 14 8 20 8"
                stroke="#0071e3"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="9"
                y1="15"
                x2="15"
                y2="15"
                stroke="#0071e3"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: '24px',
              maxWidth: '900px',
              lineHeight: 1.2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {productName}
          </div>

          {/* Metadata */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
              fontSize: '28px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '40px',
            }}
          >
            <span>{storeName}</span>
            {date && (
              <>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                <span>{date}</span>
              </>
            )}
          </div>

          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 32px',
              background: 'rgba(0, 113, 227, 0.15)',
              border: '2px solid rgba(0, 113, 227, 0.3)',
              borderRadius: '12px',
              fontSize: '24px',
              color: '#0071e3',
              fontWeight: '600',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#0071e3',
              }}
            />
            Verified Certificate
          </div>
        </div>
      ),
      {
        ...size,
      }
    )
  } catch (error) {
    // Fallback image
    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: '64px', fontWeight: 'bold', color: 'white' }}>
            Quantix Analytics
          </div>
          <div style={{ fontSize: '32px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '16px' }}>
            Certificate of Analysis
          </div>
        </div>
      ),
      {
        ...size,
      }
    )
  }
}
