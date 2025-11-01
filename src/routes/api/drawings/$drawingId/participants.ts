import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '@/db/index'
import { participants } from '@/db/schema'

export const Route = createFileRoute('/api/drawings/$drawingId/participants')({
  server: {
    handlers: {
      GET: async ({ params }: { params: { drawingId: string } }) => {
        try {
          const drawingParticipants = await db
            .select()
            .from(participants)
            .where(eq(participants.drawingId, params.drawingId))

          return new Response(JSON.stringify(drawingParticipants), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching participants:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch participants' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
