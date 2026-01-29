import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkMetadata() {
  const { data, error } = await supabase
    .from('store_documents')
    .select('id, document_name, metadata')
    .ilike('document_name', '%wonka%')
    .limit(1)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Document:', data.document_name)
  console.log('Metadata:', JSON.stringify(data.metadata, null, 2))
}

checkMetadata()
