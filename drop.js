import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lxywfmyoeovzthfmphbl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eXdmbXlvZW92enRoZm1waGJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA4MTQ3MywiZXhwIjoyMDg1NjU3NDczfQ.S6BGUGaulkgkEzhY5PwHmhkoa_vAoNJR93XL9fv8Lbg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteAllBuckets() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    console.error('Error listing buckets:', listError)
    return
  }

  for (const bucket of buckets) {
    console.log('Deleting all files in bucket:', bucket.name)

    // List all files in the bucket
    const { data: files, error: listFilesError } = await supabase.storage.from(bucket.name).list('', { recursive: true })
    if (listFilesError) {
      console.error('Error listing files:', listFilesError)
      continue
    }

    // Delete all files
    if (files.length > 0) {
      const filePaths = files.map(f => f.name)
      const { error: deleteFilesError } = await supabase.storage.from(bucket.name).remove(filePaths)
      if (deleteFilesError) {
        console.error('Error deleting files:', deleteFilesError)
        continue
      }
    }

    // Now delete the bucket
    console.log('Deleting bucket:', bucket.name)
    const { error: deleteBucketError } = await supabase.storage.deleteBucket(bucket.name)
    if (deleteBucketError) {
      console.error('Error deleting bucket:', deleteBucketError)
    }
  }
}

deleteAllBuckets()
