import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'

import { auth } from '@/lib/auth'
import { db } from '@/db/index'
import { packs, paypalPayments } from '@/db/schema'
import {
  centsToUsdString,
  getPayPalAccessToken,
  getPayPalBaseUrl,
} from '@/lib/paypal'

interface CreateOrderBody {
  packId: number
}

export const Route = createFileRoute('/api/paypal/create-order')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })
          if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const body = (await request.json()) as Partial<CreateOrderBody>
          const packId = Number(body.packId)

          if (!packId || Number.isNaN(packId)) {
            return new Response(JSON.stringify({ error: 'Missing packId' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const [pack] = await db
            .select()
            .from(packs)
            .where(and(eq(packs.id, packId), eq(packs.isActive, true)))
            .limit(1)

          if (!pack) {
            return new Response(
              JSON.stringify({ error: 'Pack not found or inactive' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } },
            )
          }

          if (pack.price <= 0) {
            return new Response(
              JSON.stringify({ error: 'Pack price must be greater than 0' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const accessToken = await getPayPalAccessToken()
          const baseUrl = getPayPalBaseUrl()

          const createRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              intent: 'CAPTURE',
              purchase_units: [
                {
                  amount: {
                    currency_code: 'USD',
                    value: centsToUsdString(pack.price),
                  },
                  description: `Pack: ${pack.name}`,
                },
              ],
            }),
          })

          if (!createRes.ok) {
            const text = await createRes.text().catch(() => '')
            console.error('PayPal create order failed:', createRes.status, text)
            return new Response(
              JSON.stringify({ error: 'Failed to create PayPal order' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const data = (await createRes.json()) as { id?: string }
          const orderId = data.id

          if (!orderId) {
            return new Response(
              JSON.stringify({ error: 'PayPal did not return an order id' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            )
          }

          await db.insert(paypalPayments).values({
            userId: session.user.id,
            packId: pack.id,
            paypalOrderId: orderId,
            amountPaid: pack.price,
            currency: 'USD',
            status: 'CREATED',
          })

          return new Response(JSON.stringify({ orderId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error creating PayPal order:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to create PayPal order' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
