import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const docId = params.id

  try {
    const { data: doc, error } = await supabase
      .from('store_documents')
      .select('file_url, thumbnail_url')
      .eq('id', docId)
      .single()

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // If thumbnail already exists in Supabase storage, redirect to it
    if (doc.thumbnail_url && doc.thumbnail_url.includes('supabase.co/storage/')) {
      return NextResponse.redirect(doc.thumbnail_url)
    }

    // Generate screenshot via ConvertAPI
    const response = await fetch('https://v2.convertapi.com/convert/pdf/to/png', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Parameters: [
          { Name: 'File', FileValue: { Url: doc.file_url } },
          { Name: 'PageRange', Value: '1' },
          { Name: 'ScaleImage', Value: 'true' },
          { Name: 'ScaleProportions', Value: 'true' },
          { Name: 'ImageHeight', Value: '800' }
        ]
      })
    })

    const result = await response.json()

    if (!result.Files?.[0]?.FileData) {
      return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 })
    }

    // Download the image data (base64) and upload to Supabase storage
    const imageBuffer = Buffer.from(result.Files[0].FileData, 'base64')
    const storagePath = `thumbs/${docId}.png`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to store thumbnail' }, { status: 500 })
    }

    // Build permanent public URL
    const thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/screenshots/${storagePath}`

    // Save URL to database
    await supabase
      .from('store_documents')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', docId)

    return NextResponse.redirect(thumbnailUrl)

  } catch (error) {
    console.error('Thumbnail generation error:', error)
    return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 })
  }
}
