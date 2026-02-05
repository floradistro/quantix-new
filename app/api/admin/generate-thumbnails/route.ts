import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

async function generateThumbnail(docId: string, fileUrl: string): Promise<string | null> {
  try {
    const response = await fetch('https://v2.convertapi.com/convert/pdf/to/png', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Parameters: [
          { Name: 'File', FileValue: { Url: fileUrl } },
          { Name: 'PageRange', Value: '1' },
          { Name: 'ScaleImage', Value: 'true' },
          { Name: 'ScaleProportions', Value: 'true' },
          { Name: 'ImageHeight', Value: '800' }
        ]
      })
    })

    const result = await response.json()
    if (!result.Files?.[0]?.FileData) return null

    const imageBuffer = Buffer.from(result.Files[0].FileData, 'base64')
    const storagePath = `thumbs/${docId}.png`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      console.error(`Upload failed for ${docId}:`, uploadError)
      return null
    }

    const thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/screenshots/${storagePath}`

    await supabase
      .from('store_documents')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', docId)

    return thumbnailUrl
  } catch (err) {
    console.error(`Failed for ${docId}:`, err)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get all docs missing thumbnails
    const { data: docs, error } = await supabase
      .from('store_documents')
      .select('id, file_url, thumbnail_url')
      .eq('is_active', true)
      .or('thumbnail_url.is.null,thumbnail_url.not.ilike.%supabase.co/storage/%')
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!docs || docs.length === 0) {
      return NextResponse.json({ message: 'All documents already have thumbnails', count: 0 })
    }

    console.log(`Generating thumbnails for ${docs.length} documents...`)

    // Process 3 at a time to not overwhelm ConvertAPI
    const results = { success: 0, failed: 0, total: docs.length }
    const concurrency = 3

    for (let i = 0; i < docs.length; i += concurrency) {
      const batch = docs.slice(i, i + concurrency)
      const promises = batch.map(doc => generateThumbnail(doc.id, doc.file_url))
      const batchResults = await Promise.all(promises)

      batchResults.forEach(result => {
        if (result) results.success++
        else results.failed++
      })

      console.log(`Progress: ${results.success + results.failed}/${results.total}`)
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Batch thumbnail error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
