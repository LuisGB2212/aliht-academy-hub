/**
 * uploadUtils.ts
 *
 * Encapsulates all S3 pre-signed URL upload logic.
 * The frontend NEVER sends the file to our API — it uploads directly to S3 using
 * a temporary pre-signed PUT URL obtained from the backend.
 *
 * Flow:
 *   1. Call `getPresignedUrl()` → API returns { upload_url, public_url, key }
 *   2. Call `uploadFileToS3(file, upload_url)` → PUT file directly to S3
 *   3. Store `public_url` (CDN URL) in the database via the normal lesson/platform save
 *
 * NOTE: AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION,
 *       AWS_BUCKET) and CLOUDFRONT_URL must be configured in the API's .env by the developer.
 */

import { apiRepository } from './apiRepository'
import type { PresignedUrlResponse, UploadCategory } from '@/types/academy-type'

// ─── Max file sizes per category (bytes) ─────────────────────────────────────
export const MAX_FILE_SIZES: Record<UploadCategory, number> = {
  video: 500 * 1024 * 1024,  // 500 MB
  pdf:    50 * 1024 * 1024,  //  50 MB
  image:   5 * 1024 * 1024,  //   5 MB
}

// ─── Accepted MIME types per category ────────────────────────────────────────
export const ACCEPTED_MIME_TYPES: Record<UploadCategory, string[]> = {
  video: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
  pdf:   ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the `accept` string for an <input type="file"> */
export function getAcceptString(category: UploadCategory): string {
  return ACCEPTED_MIME_TYPES[category].join(',')
}

/** Validates file type and size before attempting upload */
export function validateFile(file: File, category: UploadCategory): string | null {
  if (!ACCEPTED_MIME_TYPES[category].includes(file.type)) {
    return `Tipo de archivo no permitido. Se aceptan: ${ACCEPTED_MIME_TYPES[category].join(', ')}`
  }
  if (file.size > MAX_FILE_SIZES[category]) {
    const maxMb = MAX_FILE_SIZES[category] / (1024 * 1024)
    return `El archivo supera el límite de ${maxMb} MB.`
  }
  return null
}

// ─── Core upload functions ────────────────────────────────────────────────────

/**
 * Step 1 — Request a pre-signed PUT URL from the API.
 * Returns `{ upload_url, public_url, key }` on success.
 */
export async function getPresignedUrl(
  file: File,
  category: UploadCategory,
): Promise<PresignedUrlResponse> {
  const res = await apiRepository.post<PresignedUrlResponse>({
    endpoint: '/academy/upload/presigned-url',
    body: {
      file_name:   file.name,
      file_type:   file.type,
      upload_type: category,
    },
  })

  if (!res.success) {
    throw new Error((res as any).message ?? 'No se pudo obtener la URL de carga.')
  }

  return res.data
}

/**
 * Step 2 — PUT the file directly to S3 using the pre-signed URL.
 * Reports upload progress via the optional `onProgress` callback (0–100).
 */
export function uploadFileToS3(
  file: File,
  presignedUrl: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
    }

    xhr.addEventListener('load', () => {
      // S3 returns 200 or 204 on success
      if (xhr.status === 200 || xhr.status === 204) {
        resolve()
      } else {
        reject(new Error(`Error al subir a S3 (HTTP ${xhr.status})`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Error de red al subir el archivo.')))
    xhr.addEventListener('abort', () => reject(new Error('Carga cancelada.')))

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * Full upload pipeline — validates, gets pre-signed URL, uploads, returns CDN URL.
 *
 * @param file       The File object from the input
 * @param category   'video' | 'pdf' | 'image'
 * @param onProgress Optional progress callback (0–100)
 * @returns          The public CDN URL to store in the database
 */
export async function uploadAcademyFile(
  file: File,
  category: UploadCategory,
  onProgress?: (percent: number) => void,
): Promise<{ publicUrl: string; key: string }> {
  // Client-side validation first (avoids unnecessary API calls)
  const validationError = validateFile(file, category)
  if (validationError) throw new Error(validationError)

  // Step 1: Get pre-signed URL
  const { upload_url, public_url, key } = await getPresignedUrl(file, category)
  console.log('upload_url', upload_url)
  console.log('public_url', public_url)
  console.log('key', key)

  // Step 2: Upload directly to S3
  await uploadFileToS3(file, upload_url.url, onProgress)

  return { publicUrl: public_url, key }
}
