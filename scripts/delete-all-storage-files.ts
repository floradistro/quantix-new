import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function deleteAllStorageFiles() {
  console.log('🗑️  Deleting all files from vendor-coas storage bucket...\n')

  try {
    // List all files in the vendor-coas bucket
    const { data: files, error: listError } = await supabase
      .storage
      .from('vendor-coas')
      .list('', {
        limit: 1000,
        offset: 0,
      })

    if (listError) {
      console.error('❌ Error listing files:', listError)
      return
    }

    if (!files || files.length === 0) {
      console.log('✅ No files to delete - storage bucket is already empty')
      return
    }

    console.log(`Found ${files.length} top-level items in storage\n`)

    // Get all file paths recursively
    const allFilePaths: string[] = []

    async function listFilesRecursively(prefix: string = '') {
      const { data, error } = await supabase
        .storage
        .from('vendor-coas')
        .list(prefix, {
          limit: 1000,
          offset: 0,
        })

      if (error) {
        console.error(`Error listing ${prefix}:`, error)
        return
      }

      if (!data) return

      for (const item of data) {
        const itemPath = prefix ? `${prefix}/${item.name}` : item.name

        if (item.id === null) {
          // It's a folder, recurse into it
          await listFilesRecursively(itemPath)
        } else {
          // It's a file
          allFilePaths.push(itemPath)
        }
      }
    }

    await listFilesRecursively()

    console.log(`\nTotal files to delete: ${allFilePaths.length}\n`)

    if (allFilePaths.length === 0) {
      console.log('✅ No files to delete')
      return
    }

    // Delete files in batches of 100 (Supabase limit)
    const batchSize = 100
    let deletedCount = 0
    let errorCount = 0

    for (let i = 0; i < allFilePaths.length; i += batchSize) {
      const batch = allFilePaths.slice(i, i + batchSize)

      console.log(`Deleting batch ${Math.floor(i / batchSize) + 1} (${batch.length} files)...`)

      const { data, error } = await supabase
        .storage
        .from('vendor-coas')
        .remove(batch)

      if (error) {
        console.error(`❌ Error deleting batch:`, error)
        errorCount += batch.length
      } else {
        deletedCount += batch.length
        console.log(`✅ Deleted ${batch.length} files`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 Deletion Summary:')
    console.log(`   Total files: ${allFilePaths.length}`)
    console.log(`   ✅ Deleted: ${deletedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log('='.repeat(50))

  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

deleteAllStorageFiles()
  .then(() => {
    console.log('\n✨ Storage cleanup completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Storage cleanup failed:', error)
    process.exit(1)
  })
