// Buy Me a Coffee Webhooks handler for TanStack Start
// See: https://studio.buymeacoffee.com/webhooks/docs
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/coffee')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // GET handler - Buy Me a Coffee sends data as query parameters
        const url = new URL(request.url)
        const params = Object.fromEntries(url.searchParams.entries())

        console.log('=== Buy Me a Coffee Webhook Received (GET) ===')
        console.log('Headers:', Object.fromEntries(request.headers.entries()))
        console.log('Query Params:', JSON.stringify(params, null, 2))
        console.log('==============================================')

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      },
      POST: async ({ request }) => {
        try {
          // Get the raw body for logging
          const body = await request.json()

          // Log the incoming webhook request
          console.log('=== Buy Me a Coffee Webhook Received ===')
          console.log('Headers:', Object.fromEntries(request.headers.entries()))
          console.log('Body:', JSON.stringify(body, null, 2))
          console.log('========================================')

          // Log specific event details
          console.log('Event Type:', body.type)
          console.log('Live Mode:', body.live_mode)
          console.log('Event Data:', body.data)

          // Return 200 OK to acknowledge receipt
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          })
        } catch (error) {
          console.error('Error processing Buy Me a Coffee webhook:', error)

          // Still return 200 to prevent retries during development
          return new Response(
            JSON.stringify({ error: 'Failed to process webhook' }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
        }
      },
    },
  },
})
