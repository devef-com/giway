import { createFileRoute } from '@tanstack/react-router'
import { eq, sql } from 'drizzle-orm'

import { db } from '@/db/index'
import { numberSlots, participants } from '@/db/schema'

export const Route = createFileRoute('/api/drawings/$drawingId/participants')({
  server: {
    handlers: {
      GET: async ({ params }: { params: { drawingId: string } }) => {
        try {
          const drawingParticipants = await db
            .select({
              id: participants.id,
              drawingId: participants.drawingId,
              name: participants.name,
              email: participants.email,
              phone: participants.phone,
              selectedNumber: participants.selectedNumber,
              logNumbers: participants.logNumbers,
              isEligible: participants.isEligible,
              paymentCaptureId: participants.paymentCaptureId,
              createdAt: participants.createdAt,
              numbers: sql<
                Array<number>
              >`array_agg(${numberSlots.number}) filter (where ${numberSlots.number} is not null)`.as(
                'numbers',
              ),
            })
            .from(participants)
            .leftJoin(
              numberSlots,
              eq(numberSlots.participantId, participants.id),
            )
            .where(eq(participants.drawingId, params.drawingId))
            .groupBy(participants.id)

          return new Response(JSON.stringify(drawingParticipants), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching participants:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch participants' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
