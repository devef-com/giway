import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '@/db/index'
import { drawings } from '@/db/schema'

export const Route = createFileRoute('/api/drawings/$drawingId')({
  server: {
    handlers: {
      GET: async ({ params }: { params: { drawingId: string } }) => {
        try {
          const drawing = await db
            .select()
            .from(drawings)
            .where(eq(drawings.id, params.drawingId))
            .limit(1)

          if (drawing.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Drawing not found' }),
              {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          return new Response(JSON.stringify(drawing[0]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching drawing:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch drawing' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
      PUT: async ({
        params,
        request,
      }: {
        params: { drawingId: string }
        request: Request
      }) => {
        try {
          const body = await request.json()

          // Check if drawing exists
          const existingDrawing = await db
            .select()
            .from(drawings)
            .where(eq(drawings.id, params.drawingId))
            .limit(1)

          if (existingDrawing.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Drawing not found' }),
              {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          // Build update object - only update allowed fields with valid values
          // Note: playWithNumbers and quantityOfNumbers are NOT editable
          // If a value is empty/undefined, use the existing value from DB
          const updateData: {
            title?: string
            guidelines?: string[]
            isPaid?: boolean
            price?: number
            winnerSelection?: 'manually' | 'system'
            winnersAmount?: number
            endAt?: Date
          } = {}

          if (body.title !== undefined && body.title !== '') {
            updateData.title = body.title
          }
          if (body.guidelines !== undefined) {
            updateData.guidelines = body.guidelines
          }
          if (body.isPaid !== undefined) {
            updateData.isPaid = body.isPaid
          }
          if (body.price !== undefined) {
            updateData.price = body.price
          }
          if (
            body.winnerSelection &&
            (body.winnerSelection === 'manually' ||
              body.winnerSelection === 'system')
          ) {
            updateData.winnerSelection = body.winnerSelection
          }
          if (body.winnersAmount !== undefined && body.winnersAmount > 0) {
            updateData.winnersAmount = body.winnersAmount
          }
          if (body.endAt !== undefined && body.endAt !== '') {
            updateData.endAt = new Date(body.endAt)
          }

          // Update the drawing
          const [updatedDrawing] = await db
            .update(drawings)
            .set(updateData)
            .where(eq(drawings.id, params.drawingId))
            .returning()

          return new Response(JSON.stringify(updatedDrawing), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error updating drawing:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to update drawing' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
