import { supabase } from '../lib/supabase'

const documentTypes = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

function safeFilename(filename: string) {
  const cleaned = filename.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  if (!cleaned || cleaned.includes('..')) throw new Error('Choose a file with a valid name.')
  return cleaned.slice(0, 180)
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || typeof userId !== 'string') throw new Error('Please sign in again.')
  return userId
}

export async function uploadAcademicDocument(file: File, input: { title?: string; subjectId?: string | null; documentType?: string }) {
  if (!documentTypes.has(file.type) || file.size > 10 * 1024 * 1024 || file.size === 0) throw new Error('Use a PDF, TXT, or DOCX document up to 10 MB.')
  const userId = await currentUserId()
  const id = crypto.randomUUID()
  const filename = safeFilename(file.name)
  const path = `${userId}/${id}/${filename}`
  const { error: rowError } = await supabase.from('documents').insert({
    id,
    subject_id: input.subjectId || null,
    title: input.title?.trim() || filename,
    original_filename: filename,
    storage_bucket: 'academic-documents',
    storage_path: path,
    mime_type: file.type,
    size_bytes: file.size,
    document_type: input.documentType || 'other',
  })
  if (rowError) throw new Error('Document metadata could not be saved.')
  const { error: uploadError } = await supabase.storage.from('academic-documents').upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) {
    await supabase.from('documents').delete().eq('id', id)
    throw new Error('Document upload failed.')
  }
  return { id, path }
}

export async function getDocumentPreview(path: string) {
  const { data, error } = await supabase.storage.from('academic-documents').createSignedUrl(path, 300)
  if (error || !data?.signedUrl) throw new Error('A preview link could not be created.')
  return data.signedUrl
}

export async function uploadAvatar(file: File) {
  if (!imageTypes.has(file.type) || file.size > 2 * 1024 * 1024 || file.size === 0) throw new Error('Use a JPG, PNG, or WebP image up to 2 MB.')
  const userId = await currentUserId()
  const path = `${userId}/avatar-${crypto.randomUUID()}.${file.type.split('/')[1]}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error('Avatar upload failed.')
  return path
}
