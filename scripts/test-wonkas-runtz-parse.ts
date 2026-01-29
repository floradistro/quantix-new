import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import PDFParser from 'pdf2json'

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
  const thcMatch = text.match(/(?:Total\s*)?THC[:\s]+(\d+\.?\d*)\s*%/i)
  if (thcMatch) {
    metadata.thc_total = parseFloat(thcMatch[1])
  }

  const cbdMatch = text.match(/(?:Total\s*)?CBD[:\s]+(\d+\.?\d*)\s*%/i)
  if (cbdMatch) {
    metadata.cbd_total = parseFloat(cbdMatch[1])
  }

  const terpenesMatch = text.match(/(?:Total\s*)?Terpenes?[:\s]+(\d+\.?\d*)\s*%/i)
  if (terpenesMatch) {
    metadata.terpenes_total = parseFloat(terpenesMatch[1])
  }

  // Try alternative cannabinoid patterns
  if (!metadata.thc_total) {
    const altThc = text.match(/Δ?9?-?THC[:\s]+(\d+\.?\d*)/i)
    if (altThc) metadata.thc_total = parseFloat(altThc[1])
  }

  if (!metadata.cbd_total) {
    const altCbd = text.match(/CBD[:\s]+(\d+\.?\d*)/i)
    if (altCbd) metadata.cbd_total = parseFloat(altCbd[1])
  }

  return metadata
}

// Parse various date formats to ISO string
function parseDate(dateStr: string): string {
  try {
    const parts = dateStr.split(/[\/\-]/)

    if (parts.length === 3) {
      let month: number, day: number, year: number

      if (parts[2].length === 2) {
        year = parseInt(parts[2]) + 2000
      } else {
        year = parseInt(parts[2])
      }

      month = parseInt(parts[0])
      day = parseInt(parts[1])

      if (month > 12) {
        [month, day] = [day, month]
      }

      const date = new Date(year, month - 1, day)
      return date.toISOString()
    }

    const parsed = Date.parse(dateStr)
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString()
    }

    return dateStr
  } catch (e) {
    return dateStr
  }
}

// Download and parse a PDF from URL using pdf2json
async function parsePdfFromUrl(url: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Downloading PDF from: ${url}`)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Write to temp file
      const tempFile = `/tmp/temp-coa-${Date.now()}.pdf`
      fs.writeFileSync(tempFile, buffer)

      const pdfParser = new (PDFParser as any)(null, 1)

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        fs.unlinkSync(tempFile)
        reject(new Error(errData.parserError))
      })

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract all text from PDF
          let fullText = ''
          if (pdfData && pdfData.Pages) {
            for (const page of pdfData.Pages) {
              if (page.Texts) {
                for (const text of page.Texts) {
                  if (text.R) {
                    for (const run of text.R) {
                      if (run.T) {
                        fullText += decodeURIComponent(run.T) + ' '
                      }
                    }
                  }
                }
                fullText += '\n'
              }
            }
          }

          fs.unlinkSync(tempFile)
          resolve(fullText)
        } catch (error: any) {
          fs.unlinkSync(tempFile)
          reject(error)
        }
      })

      pdfParser.loadPDF(tempFile)
    } catch (error: any) {
      reject(error)
    }
  })
}

async function testWonkasRuntz() {
  console.log('🔍 Finding Wonkas Runtz COA...\n')

  // Find Wonkas Runtz document
  const { data: docs, error: docError } = await supabase
    .from('store_documents')
    .select('id, document_name, file_url, metadata')
    .ilike('document_name', '%wonka%')
    .eq('is_active', true)
    .limit(1)

  if (docError || !docs || docs.length === 0) {
    console.error('❌ Could not find Wonkas Runtz document')
    return
  }

  const doc = docs[0]
  console.log(`✅ Found document: ${doc.document_name}`)
  console.log(`   ID: ${doc.id}`)
  console.log(`   URL: ${doc.file_url}\n`)

  console.log('📄 Parsing PDF...\n')

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

testWonkasRuntz()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error:', error)
    process.exit(1)
  })
