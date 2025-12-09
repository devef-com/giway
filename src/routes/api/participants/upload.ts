import { createFileRoute } from '@tanstack/react-router'
import { nanoid } from 'nanoid'

import { getSignedUploadUrl } from '@/lib/s3'

// Allowed file types for payout proof (images and PDFs)
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

// Maximum file size in bytes (1MB)
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024

// Default folder for participant assets
const DEFAULT_PARTICIPANT_ASSETS_FOLDER = 'participants'

type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number]

function isAllowedFileType(mimeType: string): mimeType is AllowedFileType {
  return ALLOWED_FILE_TYPES.includes(mimeType as AllowedFileType)
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  }
  return mimeToExt[mimeType] || 'jpg'
}

export const Route = createFileRoute('/api/participants/upload')({
  server: {
    handlers: {
      // Generate a presigned URL for uploading a payout proof file
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as {
            mimeType: string
            size: number
            drawingId: string
          }

          const { mimeType, size, drawingId } = body

          // Validate MIME type
          if (!isAllowedFileType(mimeType)) {
            return new Response(
              JSON.stringify({
                error: `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Validate file size
          if (size > MAX_FILE_SIZE_BYTES) {
            return new Response(
              JSON.stringify({
                error: `File size too large. Maximum allowed: ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Generate unique S3 key using configurable folder
          const extension = getExtensionFromMimeType(mimeType)
          const fileId = nanoid(16)
          const assetsFolder =
            process.env.PARTICIPANT_ASSETS_FOLDER ||
            DEFAULT_PARTICIPANT_ASSETS_FOLDER
          const s3Key = `${assetsFolder}/${drawingId}/${fileId}.${extension}`

          // Get presigned upload URL
          const uploadUrl = await getSignedUploadUrl(s3Key, mimeType)

          // Get public URL
          const publicDomain = process.env.R2_PUBLIC_DOMAIN
          if (!publicDomain) {
            return new Response(
              JSON.stringify({ error: 'R2_PUBLIC_DOMAIN not configured' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            )
          }
          const publicUrl = `https://${publicDomain}/${s3Key}`

          return new Response(
            JSON.stringify({
              uploadUrl,
              s3Key,
              publicUrl,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Error generating upload URL:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to generate upload URL' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
