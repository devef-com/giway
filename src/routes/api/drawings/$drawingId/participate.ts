import { createFileRoute } from '@tanstack/react-router'
import { eq, max } from 'drizzle-orm'

import { db } from '@/db/index'
import { drawings, participants } from '@/db/schema'
import { confirmNumberReservations } from '@/lib/number-slots'

export const Route = createFileRoute('/api/drawings/$drawingId/participate')({
  server: {
    handlers: {
      POST: async ({
        request,
        params,
      }: {
        request: Request
        params: { drawingId: string }
      }) => {
        try {
          const body = (await request.json()) as {
            name: string
            email?: string
            phone: string
            selectedNumbers?: Array<number>
          }

          // Verify drawing exists
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

          // Handle number-based drawings
          if (drawing[0].winnerSelection === 'number') {
            // Validate that numbers were provided
            if (!body.selectedNumbers || body.selectedNumbers.length === 0) {
              return new Response(
                JSON.stringify({ error: 'Please select at least one number' }),
                {
                  status: 400,
                  headers: { 'Content-Type': 'application/json' },
                },
              )
            }

            // Create a single participant record
            const newParticipant = await db
              .insert(participants)
              .values({
                drawingId: params.drawingId,
                name: body.name,
                email: body.email || null,
                phone: body.phone,
                selectedNumber: body.selectedNumbers[0], // Store first selected number as primary
                isEligible: drawing[0].isPaid ? null : true, // Pending if paid, auto-approve if free
              })
              .returning()

            // Confirm all number reservations in number_slots table
            // Link all selected numbers to this single participant
            try {
              await confirmNumberReservations(
                params.drawingId,
                body.selectedNumbers,
                newParticipant[0].id,
              )
            } catch (error) {
              // If reservation confirmation fails, rollback participant creation
              await db
                .delete(participants)
                .where(eq(participants.id, newParticipant[0].id))

              return new Response(
                JSON.stringify({
                  error:
                    'Number reservation expired or already taken. Please select another number.',
                }),
                {
                  status: 409,
                  headers: { 'Content-Type': 'application/json' },
                },
              )
            }

            return new Response(JSON.stringify(newParticipant[0]), {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Handle random selection drawings
          if (drawing[0].winnerSelection === 'random') {
            const maxSelectedNumber = await db
              .select({
                value: max(participants.selectedNumber),
              })
              .from(participants)
              .where(eq(participants.drawingId, params.drawingId))

            const selectedNumber = (maxSelectedNumber[0]?.value ?? 0) + 1

            // Create participant
            const newParticipant = await db
              .insert(participants)
              .values({
                drawingId: params.drawingId,
                name: body.name,
                email: body.email || null,
                phone: body.phone,
                selectedNumber,
                isEligible: drawing[0].isPaid ? null : true, // Pending if paid, auto-approve if free
              })
              .returning()

            return new Response(JSON.stringify(newParticipant[0]), {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Fallback error if no valid winner selection type
          return new Response(
            JSON.stringify({ error: 'Invalid drawing configuration' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        } catch (error) {
          console.error('Error creating participant:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to register for drawing' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
