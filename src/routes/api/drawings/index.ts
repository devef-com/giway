import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

import { db } from '@/db/index'
import { drawings } from '@/db/schema'
import { auth } from '@/lib/auth'

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
            { status: 500, headers: { 'Content-Type': 'application/json' } }
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
          const body = await request.json()

          const newDrawing = await db
            .insert(drawings)
            .values({
              id: nanoid(10),
              userId: session.user.id,
              title: body.title,
              guidelines: body.guidelines || [],
              isPaid: body.isPaid || false,
              price: body.price || 0,
              winnerSelection: body.winnerSelection,
              quantityOfNumbers: body.quantityOfNumbers || 0,
              isWinnerNumberRandom: body.isWinnerNumberRandom ?? true,
              endAt: new Date(body.endAt),
            })
            .returning()

          return new Response(JSON.stringify(newDrawing[0]), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error creating drawing:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to create drawing' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
