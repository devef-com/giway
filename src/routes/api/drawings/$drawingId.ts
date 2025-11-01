import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '@/db/index'
import { drawings, participants } from '@/db/schema'

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
            return new Response(JSON.stringify({ error: 'Drawing not found' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify(drawing[0]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching drawing:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch drawing' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
