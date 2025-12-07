import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

import { db } from '@/db/index'
import { Drawing, drawings, balanceConsumptions } from '@/db/schema'
import { auth } from '@/lib/auth'
import { initializeNumberSlots } from '@/lib/number-slots'
import { calculateUserBalance } from '@/routes/api/user/balance'

export const Route = createFileRoute('/api/drawings/')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const userDrawings = await db
            .select()
            .from(drawings)
            .where(eq(drawings.userId, session.user.id))

          return new Response(JSON.stringify(userDrawings), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching drawings:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch drawings' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const body = (await request.json()) as Omit<Drawing, 'id' | 'userId'>

          // Determine giway type and required resources
          const giwayType = body.playWithNumbers
            ? 'play_with_numbers'
            : 'no_numbers'
          const requiredParticipants = body.playWithNumbers
            ? body.quantityOfNumbers || 0
            : 0 // For no_numbers, participants are unlimited but we track usage

          // Get user's current balance
          const balance = await calculateUserBalance(session.user.id)
          const availableBalance =
            giwayType === 'play_with_numbers'
              ? balance.playWithNumbers
              : balance.noNumbers

          // Validate balance for play_with_numbers mode
          if (
            body.playWithNumbers &&
            requiredParticipants > availableBalance.participants
          ) {
            return new Response(
              JSON.stringify({
                error: 'Insufficient balance',
                message: `You need ${requiredParticipants} participants but only have ${availableBalance.participants} available. Please purchase more packs.`,
                required: requiredParticipants,
                available: availableBalance.participants,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // For no_numbers mode, we still need at least 1 participant in balance
          if (!body.playWithNumbers && availableBalance.participants < 1) {
            return new Response(
              JSON.stringify({
                error: 'Insufficient balance',
                message:
                  'You need at least 1 participant in your balance to create a giveaway. Please purchase more packs.',
                required: 1,
                available: availableBalance.participants,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Create the drawing
          const drawingId = nanoid(10)
          const newDrawing = await db
            .insert(drawings)
            .values({
              id: drawingId,
              userId: session.user.id,
              title: body.title,
              guidelines: body.guidelines || [],
              isPaid: body.isPaid || false,
              price: body.price || 0,
              winnerSelection: body.winnerSelection,
              quantityOfNumbers: body.quantityOfNumbers || 0,
              playWithNumbers: body.playWithNumbers ?? false,
              endAt: new Date(body.endAt),
              winnersAmount: body.winnersAmount || 1,
            })
            .returning()

          // Record balance consumption
          const consumedParticipants = body.playWithNumbers
            ? body.quantityOfNumbers || 0
            : 1 // For giveaways, consume 1 participant slot initially

          await db.insert(balanceConsumptions).values({
            userId: session.user.id,
            drawingId: drawingId,
            giwayType: giwayType,
            participants: consumedParticipants,
            images: 0, // Will be updated when images are uploaded
            emails: 0, // Will be updated when emails are sent
          })

          // Initialize number slots if play with numbers
          if (newDrawing[0].playWithNumbers) {
            await initializeNumberSlots(
              newDrawing[0].id,
              newDrawing[0].quantityOfNumbers,
            )
          }

          return new Response(JSON.stringify(newDrawing[0]), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error creating drawing:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to create drawing' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
