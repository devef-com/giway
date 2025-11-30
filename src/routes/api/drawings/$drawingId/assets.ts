import { createFileRoute } from '@tanstack/react-router'

import { db } from '@/db/index'
import { assets, drawingAssets, drawings } from '@/db/schema'
import { auth } from '@/lib/auth'
import { eq, and } from 'drizzle-orm'
import { deleteFile } from '@/lib/s3'

export const Route = createFileRoute('/api/drawings/$drawingId/assets')({
  server: {
    handlers: {
      // Confirm upload and save asset metadata
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
            url: string
            mimeType: string
            size: number
            s3Key: string
            sortOrder?: number
          }

          const { url, mimeType, size, s3Key, sortOrder = 0 } = body

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
                error: 'You are not authorized to add assets to this drawing',
              }),
              { status: 403, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Create the asset record
          const [newAsset] = await db
            .insert(assets)
            .values({
              modelType: 'drawing',
              modelId: params.drawingId,
              url,
              mimeType,
              size,
              s3Key,
              ownerId: session.user.id,
            })
            .returning()

          // Create the drawing_asset junction record
          const [newDrawingAsset] = await db
            .insert(drawingAssets)
            .values({
              drawingId: params.drawingId,
              assetId: newAsset.id,
              sortOrder,
            })
            .returning()

          return new Response(
            JSON.stringify({
              asset: newAsset,
              drawingAsset: newDrawingAsset,
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

      // Get all assets for a drawing
      GET: async ({
        request,
        params,
      }: {
        request: Request
        params: { drawingId: string }
      }) => {
        try {
          const drawingAssetsData = await db
            .select({
              id: drawingAssets.id,
              sortOrder: drawingAssets.sortOrder,
              createdAt: drawingAssets.createdAt,
              asset: {
                id: assets.id,
                url: assets.url,
                mimeType: assets.mimeType,
                size: assets.size,
                s3Key: assets.s3Key,
              },
            })
            .from(drawingAssets)
            .innerJoin(assets, eq(drawingAssets.assetId, assets.id))
            .where(eq(drawingAssets.drawingId, params.drawingId))
            .orderBy(drawingAssets.sortOrder)

          return new Response(JSON.stringify(drawingAssetsData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching assets:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch assets' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },

      // Delete an asset
      DELETE: async ({
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
          const url = new URL(request.url)
          const assetIdParam = url.searchParams.get('assetId')

          if (!assetIdParam) {
            return new Response(
              JSON.stringify({ error: 'Asset ID is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const assetId = parseInt(assetIdParam, 10)
          if (isNaN(assetId)) {
            return new Response(
              JSON.stringify({ error: 'Invalid asset ID format' }),
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
                  'You are not authorized to delete assets from this drawing',
              }),
              { status: 403, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Get the asset to delete from S3
          const assetToDelete = await db
            .select()
            .from(assets)
            .where(eq(assets.id, assetId))
            .limit(1)

          if (assetToDelete.length === 0) {
            return new Response(JSON.stringify({ error: 'Asset not found' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Delete from S3 if s3Key exists
          if (assetToDelete[0].s3Key) {
            try {
              await deleteFile(assetToDelete[0].s3Key)
            } catch (s3Error) {
              console.error('Error deleting from S3:', s3Error)
              // Continue with database deletion even if S3 deletion fails
            }
          }

          // Delete the drawing_asset junction record first (due to foreign key)
          await db
            .delete(drawingAssets)
            .where(
              and(
                eq(drawingAssets.drawingId, params.drawingId),
                eq(drawingAssets.assetId, assetId),
              ),
            )

          // Delete the asset record
          await db.delete(assets).where(eq(assets.id, assetId))

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error deleting asset:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to delete asset' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
