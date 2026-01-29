import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function deleteSaylorMFG() {
  console.log('🔍 Finding Saylor MFG COAs...\n')

  // First, find the store ID for Saylor MFG
  const { data: stores, error: storeError } = await supabase
    .from('stores')
    .select('id, store_name')
    .ilike('store_name', '%saylor%')

  if (storeError) {
    console.error('❌ Error finding store:', storeError)
    return
  }

  console.log('Found stores:', stores)

  if (stores && stores.length > 0) {
    for (const store of stores) {
      console.log(`\n📄 Processing: ${store.store_name} (ID: ${store.id})`)

      // Get all documents for this store
      const { data: docs, error: docsError } = await supabase
        .from('store_documents')
        .select('id, document_name')
        .eq('store_id', store.id)

      if (docsError) {
        console.error('❌ Error fetching documents:', docsError)
        continue
      }

      console.log(`   Found ${docs?.length || 0} documents`)

      if (docs && docs.length > 0) {
        console.log('\n   Documents to delete:')
        docs.forEach(doc => console.log(`   - ${doc.document_name}`))

        // Delete all documents for this store
        const { error: deleteError } = await supabase
          .from('store_documents')
          .delete()
          .eq('store_id', store.id)

        if (deleteError) {
          console.error('❌ Error deleting documents:', deleteError)
        } else {
          console.log(`\n   ✅ Deleted ${docs.length} documents for ${store.store_name}`)
        }
      } else {
        console.log('   No documents to delete')
      }
    }
  } else {
    console.log('⚠️  No Saylor MFG stores found')
  }

  console.log('\n✨ Done!')
}

deleteSaylorMFG()
  .catch(error => {
    console.error('\n💥 Error:', error)
    process.exit(1)
  })
