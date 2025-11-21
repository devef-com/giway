import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/drawings/reservation-time')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const reservationTimeMinutes =
            process.env.RESERVATION_TIME_MINUTES || 10

          return new Response(JSON.stringify({ reservationTimeMinutes }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching reservation time:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch reservation time' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
