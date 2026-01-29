import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

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

async function updateWonkasRuntzMetadata() {
  console.log('🔍 Finding Wonkas Runtz COA for Flora Distro...\n')

  // First, find the Flora Distro store
  const { data: stores, error: storeError } = await supabase
    .from('stores')
    .select('id, store_name')
    .ilike('store_name', '%flora%distro%')

  if (storeError || !stores || stores.length === 0) {
    console.error('❌ Could not find Flora Distro store')
    return
  }

  const storeId = stores[0].id
  console.log(`✅ Found store: ${stores[0].store_name} (${storeId})\n`)

  // Find Wonkas Runtz document
  const { data: docs, error: docError } = await supabase
    .from('store_documents')
    .select('id, document_name')
    .eq('store_id', storeId)
    .ilike('document_name', '%wonka%')
    .eq('is_active', true)

  if (docError || !docs || docs.length === 0) {
    console.error('❌ Could not find Wonkas Runtz document')
    return
  }

  console.log(`✅ Found document: ${docs[0].document_name} (${docs[0].id})\n`)

  // Update with sample metadata
  const metadata = {
    sample_id: 'QA20260126SL6M',
    batch_number: 'BATCH-2026-001',
    test_date: '2026-01-20T00:00:00.000Z',
    issue_date: '2026-01-26T00:00:00.000Z',
    lab_name: 'Quantix Analytics Lab',
    test_type: 'Full Panel',
    status: 'Pass',
    thc_total: 24.5,
    cbd_total: 0.8,
    terpenes_total: 2.3
  }

  console.log('📝 Updating metadata:')
  console.log(JSON.stringify(metadata, null, 2))
  console.log('')

  const { error: updateError } = await supabase
    .from('store_documents')
    .update({ metadata })
    .eq('id', docs[0].id)

  if (updateError) {
    console.error('❌ Error updating metadata:', updateError)
    return
  }

  console.log('✅ Successfully updated metadata!')
  console.log('\n🌐 View the COA at: https://quantixanalytics.com/coa/Flora_Distro/Wonkas_Runtz')
}

updateWonkasRuntzMetadata()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error:', error)
    process.exit(1)
  })
