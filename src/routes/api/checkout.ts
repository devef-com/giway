// Polar Checkout handler for TanStack Start
// See: https://polar.sh/docs/integrate/sdk/adapters/tanstack-start
import { Checkout } from '@polar-sh/tanstack-start'
import { createFileRoute } from '@tanstack/react-router'

const APP_URL = process.env.APP_HOST ?? 'http://localhost:3000'

export const Route = createFileRoute('/api/checkout')({
  server: {
    handlers: {
      GET: Checkout({
        accessToken: process.env.POLAR_ACCESS_TOKEN!,
        successUrl: `${APP_URL}/store?status=success`,
        server: 'sandbox', // Use 'production' when going live
        // theme: 'dark', // Optional: enforce theme
      }),
    },
  },
})
