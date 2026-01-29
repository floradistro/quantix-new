import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DataField {
  // Various possible field names from different sources
  test_date?: string
  dateTested?: string
  date_tested?: string
  completion_date?: string

  total_thc?: number | string
  total_thc_percentage?: string
  thc_total?: number
  totalTHC?: number

  total_cbd?: number | string
  total_cbd_percentage?: string
  cbd_total?: number
  totalCBD?: number

  total_cannabinoids?: number | string
  total_cannabinoids_percentage?: string
  totalCannabinoids?: number

  sample_id?: string
  sampleId?: string
  generatedSampleId?: string

  batch_id?: string
  batchId?: string
  generatedBatchId?: string

  terpenes_total?: number
  total_terpenes?: number

  [key: string]: any
}

function normalizeMetadata(data: DataField): Record<string, any> {
  const metadata: Record<string, any> = {}

  // Normalize completion/test date
  const issueDate =
    data.test_date ||
    data.dateTested ||
    data.date_tested ||
    data.completion_date

  if (issueDate) {
    try {
      // Parse date string to ISO format
      const date = new Date(issueDate)
      if (!isNaN(date.getTime())) {
        metadata.issue_date = date.toISOString()
      }
    } catch (e) {
      console.warn('Failed to parse date:', issueDate)
    }
  }

  // Normalize THC - check for pre-calculated totals first
  let thcValue =
    data.total_thc ||
    data.total_thc_percentage ||
    data.thc_total ||
    data.totalTHC

  // If no pre-calculated total, calculate from raw cannabinoid values
  if ((thcValue === undefined || thcValue === null || thcValue === 'ND' || thcValue === 'NR') &&
      (data.thca !== undefined || data.d9_thc !== undefined)) {
    // Calculate Total THC using formula: THC + (THCa × 0.877)
    const thca = parseFloat(String(data.thca || 0))
    const d9_thc = parseFloat(String(data.d9_thc || 0))

    if (!isNaN(thca) || !isNaN(d9_thc)) {
      thcValue = d9_thc + (thca * 0.877)
      console.log(`   ℹ️  Calculated Total THC: ${thcValue.toFixed(2)}% (THCa: ${thca}%, D9-THC: ${d9_thc}%)`)
    }
  }

  if (thcValue !== undefined && thcValue !== null && thcValue !== 'ND' && thcValue !== 'NR') {
    const thc = typeof thcValue === 'string' ? parseFloat(thcValue) : thcValue
    if (!isNaN(thc)) {
      metadata.thc_total = thc
    }
  }

  // Normalize CBD - check for pre-calculated totals first
  let cbdValue =
    data.total_cbd ||
    data.total_cbd_percentage ||
    data.cbd_total ||
    data.totalCBD

  // If no pre-calculated total, calculate from raw cannabinoid values
  if ((cbdValue === undefined || cbdValue === null || cbdValue === 'ND' || cbdValue === 'NR') &&
      (data.cbda !== undefined || data.cbd !== undefined)) {
    // Calculate Total CBD using formula: CBD + (CBDa × 0.877)
    const cbda = parseFloat(String(data.cbda || 0))
    const cbd = parseFloat(String(data.cbd || 0))

    if (!isNaN(cbda) || !isNaN(cbd)) {
      cbdValue = cbd + (cbda * 0.877)
      console.log(`   ℹ️  Calculated Total CBD: ${cbdValue.toFixed(2)}% (CBDa: ${cbda}%, CBD: ${cbd}%)`)
    }
  }

  if (cbdValue !== undefined && cbdValue !== null && cbdValue !== 'ND' && cbdValue !== 'NR') {
    const cbd = typeof cbdValue === 'string' ? parseFloat(cbdValue) : cbdValue
    if (!isNaN(cbd)) {
      metadata.cbd_total = cbd
    }
  }

  // Normalize total cannabinoids
  const cannaValue =
    data.total_cannabinoids ||
    data.total_cannabinoids_percentage ||
    data.totalCannabinoids

  if (cannaValue !== undefined && cannaValue !== null && cannaValue !== 'ND' && cannaValue !== 'NR') {
    const canna = typeof cannaValue === 'string' ? parseFloat(cannaValue) : cannaValue
    if (!isNaN(canna)) {
      metadata.cannabinoids_total = canna
    }
  }

  // Normalize sample ID
  const sampleId =
    data.sample_id ||
    data.sampleId ||
    data.generatedSampleId

  if (sampleId) {
    metadata.sample_id = sampleId
  }

  // Normalize batch ID
  const batchId =
    data.batch_id ||
    data.batchId ||
    data.generatedBatchId

  if (batchId) {
    metadata.batch_number = batchId
  }

  // Terpenes
  const terpenesValue =
    data.terpenes_total ||
    data.total_terpenes

  if (terpenesValue !== undefined && terpenesValue !== null) {
    const terpenes = typeof terpenesValue === 'string' ? parseFloat(terpenesValue) : terpenesValue
    if (!isNaN(terpenes)) {
      metadata.terpenes_total = terpenes
    }
  }

  // Add source tracking
  metadata.migrated_from_data = true
  metadata.migration_date = new Date().toISOString()

  return metadata
}

async function migrateDataToMetadata() {
  console.log('🔄 Starting data → metadata migration...\n')

  // Get all documents with data field but empty metadata
  const { data: documents, error } = await supabase
    .from('store_documents')
    .select('id, document_name, data, metadata, store_id')
    .not('data', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching documents:', error)
    return
  }

  console.log(`Found ${documents.length} documents with data field\n`)

  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const doc of documents) {
    console.log(`\n📄 Processing: ${doc.document_name}`)

    try {
      // Check if metadata already has data
      const hasMetadata = doc.metadata &&
        (doc.metadata.thc_total !== undefined ||
         doc.metadata.cbd_total !== undefined ||
         doc.metadata.issue_date !== undefined)

      if (hasMetadata) {
        console.log(`   ⏭️  Skipping - metadata already populated`)
        skippedCount++
        continue
      }

      // Normalize and migrate data
      const normalizedMetadata = normalizeMetadata(doc.data as DataField)

      // Check if we got any useful metadata (excluding migration tracking fields)
      const usefulKeys = Object.keys(normalizedMetadata).filter(k =>
        k !== 'migrated_from_data' && k !== 'migration_date'
      )
      const hasUsefulData = usefulKeys.length > 0

      if (!hasUsefulData) {
        console.log(`   ⚠️  Skipping - no useful data to migrate`)
        skippedCount++
        continue
      }

      // Merge with existing metadata (preserve any existing fields)
      const updatedMetadata = {
        ...doc.metadata,
        ...normalizedMetadata
      }

      // Update database
      const { error: updateError } = await supabase
        .from('store_documents')
        .update({ metadata: updatedMetadata })
        .eq('id', doc.id)

      if (updateError) {
        console.error(`   ❌ Error updating database:`, updateError)
        errorCount++
        continue
      }

      console.log(`   ✅ Migrated successfully`)
      migratedCount++

    } catch (err) {
      console.error(`❌ Error processing "${doc.document_name}":`, err)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary:')
  console.log(`   Total documents: ${documents.length}`)
  console.log(`   ✅ Migrated: ${migratedCount}`)
  console.log(`   ⏭️  Skipped: ${skippedCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log('='.repeat(60))
}

migrateDataToMetadata()
  .catch(error => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
