import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db/index'
import { drawings, participants } from '@/db/schema'

export const Route = createFileRoute('/api/drawings/$drawingId/participate')({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { drawingId: string } }) => {
        try {
          const body = await request.json()

          // Verify drawing exists
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

          // If number selection, verify the number is available
          if (drawing[0].winnerSelection === 'number' && body.selectedNumber) {
            const existingParticipant = await db
              .select()
              .from(participants)
              .where(
                and(
                  eq(participants.drawingId, params.drawingId),
                  eq(participants.selectedNumber, body.selectedNumber)
                )
              )
              .limit(1)

            // Check if number is taken by an approved or pending participant
            if (existingParticipant.length > 0 && 
                existingParticipant[0].isEligible !== false) {
              return new Response(
                JSON.stringify({ error: 'Number is already taken' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              )
            }
          }

          // Create participant
          const newParticipant = await db
            .insert(participants)
            .values({
              drawingId: params.drawingId,
              name: body.name,
              email: body.email || null,
              phone: body.phone,
              selectedNumber: body.selectedNumber || null,
              isEligible: drawing[0].isPaid ? null : true, // Pending if paid, auto-approve if free
            })
            .returning()

          return new Response(JSON.stringify(newParticipant[0]), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error creating participant:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to register for drawing' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
