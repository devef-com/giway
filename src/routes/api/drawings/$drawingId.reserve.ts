import { createFileRoute } from '@tanstack/react-router'
import {
  reserveNumber,
  releaseExpiredReservations,
  bulkReleaseReservations,
} from '@/lib/number-slots'

/**
 * POST /api/drawings/:drawingId/reserve
 *
 * Reserves a number temporarily
 * Body: { number: number, expirationMinutes?: number }
 *
 * DELETE /api/drawings/:drawingId/reserve
 *
 * Releases reserved numbers
 * Body: { numbers: number[] }
 */
export const Route = createFileRoute('/api/drawings/$drawingId/reserve')({
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
          const body = await request.json()
          const { number, expirationMinutes = 15 } = body

          if (typeof number !== 'number') {
            return new Response(JSON.stringify({ error: 'Invalid number' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Release expired reservations first
          await releaseExpiredReservations()

          const result = await reserveNumber(
            params.drawingId,
            number,
            expirationMinutes,
          )

          if (!result.success) {
            return new Response(JSON.stringify({ error: result.message }), {
              status: 409,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return new Response(
            JSON.stringify({
              success: true,
              expiresAt: result.expiresAt?.toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Reserve error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to reserve number' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
      DELETE: async ({
        request,
        params,
      }: {
        request: Request
        params: { drawingId: string }
      }) => {
        try {
          const body = await request.json()
          const { numbers } = body

          if (!Array.isArray(numbers) || numbers.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Invalid numbers array' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          const releasedCount = await bulkReleaseReservations(
            params.drawingId,
            numbers,
          )

          return new Response(
            JSON.stringify({
              success: true,
              releasedCount,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Release error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to release reservations' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
