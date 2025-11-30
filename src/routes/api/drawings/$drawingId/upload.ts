import { createFileRoute } from '@tanstack/react-router'
import { nanoid } from 'nanoid'

import { db } from '@/db/index'
import { drawings } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getSignedUploadUrl } from '@/lib/s3'
import { eq } from 'drizzle-orm'

// Allowed image MIME types (browser-supported formats)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

// Maximum file size in bytes (5MB - allows for compression results up to this size)
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

function isAllowedImageType(mimeType: string): mimeType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(mimeType as AllowedImageType)
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  return mimeToExt[mimeType] || 'jpg'
}

export const Route = createFileRoute('/api/drawings/$drawingId/upload')({
  server: {
    handlers: {
      // Generate a presigned URL for uploading an image
      POST: async ({
        request,
        params,
      }: {
        request: Request
        params: { drawingId: string }
      }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const body = (await request.json()) as {
            mimeType: string
            size: number
          }

          const { mimeType, size } = body

          // Validate MIME type
          if (!isAllowedImageType(mimeType)) {
            return new Response(
              JSON.stringify({
                error: `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
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

          // Verify the drawing belongs to the user
          const drawing = await db
            .select()
            .from(drawings)
            .where(eq(drawings.id, params.drawingId))
            .limit(1)

          if (drawing.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Drawing not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } },
            )
          }

          if (drawing[0].userId !== session.user.id) {
            return new Response(
              JSON.stringify({
                error:
                  'You are not authorized to upload images to this drawing',
              }),
              { status: 403, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Generate unique S3 key using configurable folder
          const extension = getExtensionFromMimeType(mimeType)
          const fileId = nanoid(16)
          const assetsFolder = process.env.DRAWING_ASSETS_FOLDER || 'drawings'
          const s3Key = `${assetsFolder}/${params.drawingId}/${fileId}.${extension}`

          // Get presigned upload URL
          const uploadUrl = await getSignedUploadUrl(s3Key, mimeType)

          // Get public URL
          const publicDomain = process.env.R2_PUBLIC_DOMAIN
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
