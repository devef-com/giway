import { createFileRoute } from '@tanstack/react-router'
import { eq, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import type { ParticipantStatus } from '@/lib/participants'
import {
  updateParticipantStatus,
  verifyParticipantOwnership,
} from '@/lib/participants'
import { db } from '@/db/index'
import { numberSlots, participants } from '@/db/schema'

export const Route = createFileRoute('/api/participant/$participantId')({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request
        params: { participantId: string }
      }) => {
        // Check authentication
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const participantId = parseInt(params.participantId, 10)

          if (isNaN(participantId)) {
            return new Response(
              JSON.stringify({ error: 'Invalid participant ID' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          // Verify ownership
          const hasOwnership = await verifyParticipantOwnership(
            participantId,
            session.user.id,
          )

          if (!hasOwnership) {
            return new Response(
              JSON.stringify({
                error:
                  'Forbidden: You do not have permission to view this participant',
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          // Fetch participant with numbers
          const participant = await db
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
            .where(eq(participants.id, participantId))
            .groupBy(participants.id)
            .then((results) => results[0])

          if (!participant) {
            return new Response(
              JSON.stringify({ error: 'Participant not found' }),
              {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          return new Response(JSON.stringify(participant), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching participant:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch participant' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
      POST: async ({
        request,
        params,
      }: {
        request: Request
        params: { participantId: string }
      }) => {
        // Check authentication
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const participantId = parseInt(params.participantId, 10)

          if (isNaN(participantId)) {
            return new Response(
              JSON.stringify({ error: 'Invalid participant ID' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          // Verify that the participant's drawing belongs to the authenticated user
          const hasOwnership = await verifyParticipantOwnership(
            participantId,
            session.user.id,
          )

          if (!hasOwnership) {
            return new Response(
              JSON.stringify({
                error:
                  'Forbidden: You do not have permission to update this participant',
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          // Parse request body
          let body: { status?: ParticipantStatus }
          try {
            body = (await request.json()) as {
              status?: ParticipantStatus
            }
          } catch (error) {
            return new Response(
              JSON.stringify({ error: 'Invalid JSON body' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          if (!body.status || typeof body.status !== 'string') {
            return new Response(
              JSON.stringify({
                error: 'Status is required and must be a string',
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          // Validate status value
          const validStatuses: ParticipantStatus[] = [
            'pending',
            'approved',
            'rejected',
          ]
          if (!validStatuses.includes(body.status)) {
            return new Response(
              JSON.stringify({
                error:
                  'Invalid status. Must be one of: pending, approved, rejected',
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          // Handle rejection: store numbers before releasing slots
          if (body.status === 'rejected') {
            // Use a transaction to prevent race conditions
            await db.transaction(async (tx) => {
              // Get all numbers assigned to this participant
              const participantSlots = await tx
                .select({ number: numberSlots.number })
                .from(numberSlots)
                .where(eq(numberSlots.participantId, participantId))
                .orderBy(numberSlots.number)

              const numbers = participantSlots.map((slot) => slot.number)

              // Store the numbers in logNumbers before releasing
              if (numbers.length > 0) {
                await tx
                  .update(participants)
                  .set({ logNumbers: numbers })
                  .where(eq(participants.id, participantId))
              }

              // Release number slots
              await tx
                .update(numberSlots)
                .set({ participantId: null, status: 'available' })
                .where(eq(numberSlots.participantId, participantId))
            })
          }

          // Update participant status
          const result = await updateParticipantStatus(
            participantId,
            body.status,
          )

          if (!result.success) {
            return new Response(
              JSON.stringify({
                error: result.message || 'Failed to update participant status',
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: result.message,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        } catch (error) {
          console.error('Error updating participant status:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to update participant status' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
