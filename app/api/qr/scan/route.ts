import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qr_code, store_id, document_id, referrer, user_agent } = body

    if (!qr_code || !store_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find the qr_code record by code (sample ID)
    const { data: qrRecord, error: qrError } = await supabase
      .from('qr_codes')
      .select('id, store_id')
      .eq('code', qr_code)
      .eq('store_id', store_id)
      .single()

    if (qrError || !qrRecord) {
      console.error('[QR Scan] QR code not found:', qr_code, qrError)
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 })
    }

    // Get device/location info from headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    const cfCountry = request.headers.get('cf-ipcountry')
    const cfCity = request.headers.get('cf-ipcity')
    const cfRegion = request.headers.get('cf-region')

    // Generate fingerprint from IP + user agent
    const fingerprint = Buffer.from(`${ip}:${user_agent}`).toString('base64').slice(0, 255)

    // Parse device info (basic)
    const isMobile = /mobile/i.test(user_agent || '')
    const isTablet = /tablet|ipad/i.test(user_agent || '')
    const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

    // Insert scan record
    const { error: scanError } = await supabase
      .from('qr_scans')
      .insert({
        qr_code_id: qrRecord.id,
        store_id: store_id,
        fingerprint_id: fingerprint,
        ip_address: ip,
        user_agent: user_agent,
        device_type: deviceType,
        referrer: referrer,
        country: cfCountry || null,
        city: cfCity || null,
        region: cfRegion || null,
        operation: 'view',
        custom_data: { document_id },
      })

    if (scanError) {
      console.error('[QR Scan] Failed to insert scan:', scanError)
      return NextResponse.json({ error: 'Failed to track scan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[QR Scan] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
