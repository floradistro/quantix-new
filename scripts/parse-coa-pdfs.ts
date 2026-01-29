import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as pdfjsLib from 'pdfjs-dist'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface COAMetadata {
  sample_id?: string
  batch_number?: string
  test_date?: string
  issue_date?: string
  lab_name?: string
  test_type?: string
  status?: string
  thc_total?: number
  cbd_total?: number
  terpenes_total?: number
}

// Parse text to extract COA metadata
function extractMetadata(text: string): COAMetadata {
  const metadata: COAMetadata = {}

  // Common patterns for cannabis COAs
  const patterns = {
    sample_id: /(?:Sample\s*(?:ID|#)|Sample\s*Name)[:\s]+([A-Z0-9-]+)/i,
    batch_number: /(?:Batch|Lot)\s*(?:Number|#|ID)[:\s]+([A-Z0-9-]+)/i,
    test_date: /(?:Test(?:ed)?|Analysis|Sample)\s*Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    issue_date: /(?:Issue(?:d)?|Report|Completion|Completed)\s*Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    lab_name: /(?:Laboratory|Lab|Tested\s*by)[:\s]+([A-Za-z0-9\s&,\.]+?)(?:\n|Laboratory|Phone|Address|Email)/i,
    test_type: /(?:Test\s*Type|Analysis\s*Type)[:\s]+([\w\s,]+)/i,
    status: /(?:Status|Result)[:\s]+(Pass|Fail|Pending)/i,
  }

  // Extract basic fields
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern)
    if (match && match[1]) {
      metadata[key as keyof COAMetadata] = match[1].trim() as any
    }
  }

  // Special handling for dates - convert to ISO format
  if (metadata.test_date) {
    metadata.test_date = parseDate(metadata.test_date)
  }
  if (metadata.issue_date) {
    metadata.issue_date = parseDate(metadata.issue_date)
  }

  // Extract cannabinoid values (THC, CBD, Terpenes)
  // Look for patterns like "Total THC: 24.5%" or "THC: 24.5 %"
  const thcMatch = text.match(/(?:Total\s*)?THC[:\s]+(\d+\.?\d*)\s*%/i)
  if (thcMatch) {
    metadata.thc_total = parseFloat(thcMatch[1])
  }

  const cbdMatch = text.match(/(?:Total\s*)?CBD[:\s]+(\d+\.?\d*)\s*%/i)
  if (cbdMatch) {
    metadata.cbd_total = parseFloat(cbdMatch[1])
  }

  // Terpenes might be listed as "Total Terpenes" or just "Terpenes"
  const terpenesMatch = text.match(/(?:Total\s*)?Terpenes?[:\s]+(\d+\.?\d*)\s*%/i)
  if (terpenesMatch) {
    metadata.terpenes_total = parseFloat(terpenesMatch[1])
  }

  // Try alternative cannabinoid patterns (some COAs use different formats)
  if (!metadata.thc_total) {
    const altThc = text.match(/Δ?9?-?THC[:\s]+(\d+\.?\d*)/i)
    if (altThc) metadata.thc_total = parseFloat(altThc[1])
  }

  if (!metadata.cbd_total) {
    const altCbd = text.match(/CBD[:\s]+(\d+\.?\d*)/i)
    if (altCbd) metadata.cbd_total = parseFloat(altCbd[1])
  }

  // If no lab name found, try common lab names
  if (!metadata.lab_name) {
    const commonLabs = ['SC Labs', 'Steep Hill', 'PharmLabs', 'CannaSafe', 'Digipath', 'Anresco']
    for (const lab of commonLabs) {
      if (text.includes(lab)) {
        metadata.lab_name = lab
        break
      }
    }
  }

  return metadata
}

// Parse various date formats to ISO string
function parseDate(dateStr: string): string {
  try {
    // Try common formats: MM/DD/YYYY, DD/MM/YYYY, M/D/YY, etc.
    const parts = dateStr.split(/[\/\-]/)

    if (parts.length === 3) {
      let month: number, day: number, year: number

      // Handle 2-digit years
      if (parts[2].length === 2) {
        year = parseInt(parts[2]) + 2000
      } else {
        year = parseInt(parts[2])
      }

      // Assume MM/DD/YYYY for US labs
      month = parseInt(parts[0])
      day = parseInt(parts[1])

      // Validate and swap if needed (if day > 12, it's probably DD/MM format)
      if (month > 12) {
        [month, day] = [day, month]
      }

      const date = new Date(year, month - 1, day)
      return date.toISOString()
    }

    // Fallback: try Date.parse
    const parsed = Date.parse(dateStr)
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString()
    }

    return dateStr // Return original if parsing fails
  } catch (e) {
    return dateStr
  }
}

// Download and parse a PDF from URL using pdfjs-dist
async function parsePdfFromUrl(url: string): Promise<string> {
  try {
    console.log(`Downloading PDF from: ${url}`)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
    const pdfDocument = await loadingTask.promise

    let fullText = ''

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }

    return fullText
  } catch (error: any) {
    console.error(`Error parsing PDF from ${url}:`, error.message)
    throw error
  }
}

// Main function to process all COAs
async function processAllCOAs() {
  console.log('🔍 Fetching all COA documents...\n')

  // Get all store_documents
  const { data: documents, error } = await supabase
    .from('store_documents')
    .select('id, document_name, file_url, metadata, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    return
  }

  if (!documents || documents.length === 0) {
    console.log('No documents found')
    return
  }

  console.log(`Found ${documents.length} documents to process\n`)

  let processedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const doc of documents) {
    console.log(`\n📄 Processing: ${doc.document_name}`)
    console.log(`   ID: ${doc.id}`)
    console.log(`   URL: ${doc.file_url}`)

    // Skip if metadata already exists and has required fields
    const existingMetadata = doc.metadata as COAMetadata || {}
    if (existingMetadata.issue_date && existingMetadata.thc_total !== undefined) {
      console.log('   ⏭️  Skipping - metadata already populated')
      skippedCount++
      continue
    }

    try {
      // Download and parse PDF
      const text = await parsePdfFromUrl(doc.file_url)

      // Extract metadata
      const metadata = extractMetadata(text)

      console.log('   ✅ Extracted metadata:')
      console.log(`      - Issue Date: ${metadata.issue_date || 'N/A'}`)
      console.log(`      - THC: ${metadata.thc_total !== undefined ? metadata.thc_total + '%' : 'N/A'}`)
      console.log(`      - CBD: ${metadata.cbd_total !== undefined ? metadata.cbd_total + '%' : 'N/A'}`)
      console.log(`      - Terpenes: ${metadata.terpenes_total !== undefined ? metadata.terpenes_total + '%' : 'N/A'}`)
      console.log(`      - Lab: ${metadata.lab_name || 'N/A'}`)
      console.log(`      - Sample ID: ${metadata.sample_id || 'N/A'}`)
      console.log(`      - Batch: ${metadata.batch_number || 'N/A'}`)

      // Merge with existing metadata
      const mergedMetadata = { ...existingMetadata, ...metadata }

      // Update database
      const { error: updateError } = await supabase
        .from('store_documents')
        .update({ metadata: mergedMetadata })
        .eq('id', doc.id)

      if (updateError) {
        console.error('   ❌ Error updating database:', updateError.message)
        errorCount++
      } else {
        console.log('   💾 Updated database successfully')
        processedCount++
      }

    } catch (error: any) {
      console.error(`   ❌ Error processing document: ${error.message}`)
      errorCount++
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`   Total documents: ${documents.length}`)
  console.log(`   ✅ Processed: ${processedCount}`)
  console.log(`   ⏭️  Skipped: ${skippedCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log('='.repeat(50))
}

// Run the script
processAllCOAs()
  .then(() => {
    console.log('\n✨ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })
