import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
    issue_date: /(?:Issue(?:d)?|Report|Completion|Completed)[:\s]+(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    lab_name: /(?:Laboratory|Lab|Tested\s*by)[:\s]+([A-Za-z0-9\s&,\.]+?)(?:\n|Laboratory|Phone|Address|Email)/i,
    test_type: /(?:Test\s*Type|Analysis\s*Type)[:\s]+([\w\s,]+)/i,
    status: /(?:Status|Result)[:\s]+(Pass|Fail|Pending|Complete)/i,
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

  // Extract cannabinoid values - try multiple patterns

  // Pattern 1: "THCa: 72.5%" or "Total THC: 24.5%"
  let thcMatch = text.match(/(?:Total\s*)?THC[a]?[:\s]+(\d+\.?\d*)\s*%/i)
  if (thcMatch) {
    metadata.thc_total = parseFloat(thcMatch[1])
  }

  // Pattern 2: Look for D9-THC if THCa wasn't found
  if (!metadata.thc_total) {
    thcMatch = text.match(/D9-?THC[:\s]+(\d+\.?\d*)\s*%/i)
    if (thcMatch) {
      metadata.thc_total = parseFloat(thcMatch[1])
    }
  }

  // Pattern 3: Alternative THC patterns
  if (!metadata.thc_total) {
    thcMatch = text.match(/Δ?9?-?THC[:\s]+(\d+\.?\d*)/i)
    if (thcMatch) metadata.thc_total = parseFloat(thcMatch[1])
  }

  const cbdMatch = text.match(/(?:Total\s*)?CBD[a]?[:\s]+(\d+\.?\d*)\s*%?/i)
  if (cbdMatch) {
    metadata.cbd_total = parseFloat(cbdMatch[1])
  }

  const terpenesMatch = text.match(/(?:Total\s*)?Terpenes?[:\s]+(\d+\.?\d*)\s*%/i)
  if (terpenesMatch) {
    metadata.terpenes_total = parseFloat(terpenesMatch[1])
  }

  return metadata
}

// Parse various date formats to ISO string
function parseDate(dateStr: string): string {
  try {
    // First check if it's already in ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    }

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

// Download and parse a PDF from URL using pdftotext command
async function parsePdfFromUrl(url: string): Promise<string> {
  const tempFile = `/tmp/temp-coa-${Date.now()}.pdf`
  const textFile = tempFile + '.txt'

  try {
    console.log(`Downloading PDF from: ${url.substring(0, 80)}...`)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Write to temp file
    fs.writeFileSync(tempFile, buffer)

    // Run pdftotext command
    await execAsync(`pdftotext "${tempFile}" "${textFile}"`)

    // Read the extracted text
    const text = fs.readFileSync(textFile, 'utf-8')

    // Clean up temp files
    fs.unlinkSync(tempFile)
    fs.unlinkSync(textFile)

    return text
  } catch (error: any) {
    // Clean up on error
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
    if (fs.existsSync(textFile)) fs.unlinkSync(textFile)
    throw error
  }
}

async function testGrapeApe() {
  console.log('🔍 Finding Grape Ape COA...\n')

  // Find Grape Ape document
  const { data: docs, error: docError } = await supabase
    .from('store_documents')
    .select('id, document_name, file_url, metadata')
    .ilike('document_name', '%grape%ape%')
    .eq('is_active', true)
    .limit(1)

  if (docError || !docs || docs.length === 0) {
    console.error('❌ Could not find Grape Ape document')
    return
  }

  const doc = docs[0]
  console.log(`✅ Found document: ${doc.document_name}`)
  console.log(`   ID: ${doc.id}`)
  console.log(`   URL: ${doc.file_url}\n`)

  console.log('📄 Parsing PDF with pdftotext...\n')

  try {
    // Download and parse PDF
    const text = await parsePdfFromUrl(doc.file_url)

    console.log('📝 Extracted Text (first 2000 characters):')
    console.log('=' .repeat(70))
    console.log(text.substring(0, 2000))
    console.log('=' .repeat(70))
    console.log('\n')

    // Extract metadata
    const metadata = extractMetadata(text)

    console.log('🔍 Extracted Metadata:')
    console.log(JSON.stringify(metadata, null, 2))

    console.log('\n📅 Current Database Metadata:')
    console.log(JSON.stringify(doc.metadata, null, 2))

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    console.error(error.stack)
  }
}

testGrapeApe()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error:', error)
    process.exit(1)
  })
