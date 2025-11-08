import { createFileRoute } from '@tanstack/react-router'
import { and, eq, max } from 'drizzle-orm'

import { db } from '@/db/index'
import { drawings, participants } from '@/db/schema'
import { confirmNumberReservation } from '@/lib/number-slots'

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
            selectedNumber?: number
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

          // If number selection, verify the number is available
          if (drawing[0].winnerSelection === 'number' && body.selectedNumber) {
            const existingParticipant = await db
              .select()
              .from(participants)
              .where(
                and(
                  eq(participants.drawingId, params.drawingId),
                  eq(participants.selectedNumber, body.selectedNumber),
                ),
              )
              .limit(1)

            // Check if number is taken by an approved or pending participant
            // isEligible: null = pending, true = approved, false = rejected
            // Numbers can only be reused if the previous participant was rejected
            if (existingParticipant.length > 0) {
              const isApprovedOrPending =
                existingParticipant[0].isEligible === null ||
                existingParticipant[0].isEligible === true
              if (isApprovedOrPending) {
                return new Response(
                  JSON.stringify({ error: 'Number is already taken' }),
                  {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                  },
                )
              }
            }
          }
          let selectedNumber: number | null = null

          if (drawing[0].winnerSelection === 'random') {
            const maxSelectedNumber = await db
              .select({
                value: max(participants.selectedNumber),
              })
              .from(participants)
              .where(eq(participants.drawingId, params.drawingId))

            selectedNumber = (maxSelectedNumber[0]?.value ?? 0) + 1
          } else if (
            drawing[0].winnerSelection === 'number' &&
            body.selectedNumber
          ) {
            selectedNumber = body.selectedNumber
          }

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

          // If number-based drawing, confirm the reservation in number_slots table
          if (drawing[0].winnerSelection === 'number' && body.selectedNumber) {
            try {
              await confirmNumberReservation(
                params.drawingId,
                body.selectedNumber,
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
          }

          return new Response(JSON.stringify(newParticipant[0]), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          })
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
