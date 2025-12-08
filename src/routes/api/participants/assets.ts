import { createFileRoute } from '@tanstack/react-router'

import { db } from '@/db/index'
import { assets } from '@/db/schema'

export const Route = createFileRoute('/api/participants/assets')({
  server: {
    handlers: {
      // Confirm upload and save asset metadata for participant payout proof
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as {
            url: string
            mimeType: string
            size: number
            s3Key: string
            participantId?: string
          }

          const { url, mimeType, size, s3Key, participantId } = body

          // Create the asset record
          // Note: We use 'pending' as a temporary modelId since the participant doesn't exist yet.
          // This is acceptable because:
          // 1. The asset is created immediately before participant creation in the same request flow
          // 2. If participant creation fails, the participateMutation will show an error and the user
          //    will not retry, making the orphaned asset harmless (it's just storage space)
          // 3. A future cleanup job could remove assets with modelId='pending' older than X days
          const [newAsset] = await db
            .insert(assets)
            .values({
              modelType: 'participant',
              modelId: participantId || 'pending',
              url,
              mimeType,
              size,
              s3Key,
              ownerId: null, // Participant uploads don't have an owner (not authenticated)
            })
            .returning()

          return new Response(
            JSON.stringify({
              asset: newAsset,
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Error saving asset:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to save asset' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
