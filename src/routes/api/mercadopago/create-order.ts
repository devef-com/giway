import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { Preference } from 'mercadopago'

import { auth } from '@/lib/auth'
import { db } from '@/db/index'
import { packs, mercadopagoPayments } from '@/db/schema'
import { mpClient } from '@/lib/mercadopago'

interface CreateOrderBody {
  packId: number
}

export const Route = createFileRoute('/api/mercadopago/create-order')({
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

          let appHost = process.env.APP_HOST || 'http://localhost:3000'
          if (appHost.endsWith('/')) {
            appHost = appHost.slice(0, -1)
          }

          // Usamos una URL pública de prueba si estamos en localhost
          const successUrl = appHost.includes('localhost')
            ? 'https://www.mercadopago.com.co'
            : `${appHost}/store?status=success`

          const failureUrl = `${appHost}/store?status=failure`
          const pendingUrl = `${appHost}/store?status=pending`

          const preference = new Preference(mpClient)
          const preferenceResult = await preference.create({
            body: {
              items: [
                {
                  id: String(pack.id),
                  title: pack.name,
                  quantity: 1,
                  unit_price: pack.price / 100, // Convert cents to standard currency unit
                  currency_id: 'USD', // TODO: Make dynamic based on user location or config
                },
              ],
              back_urls: {
                success: successUrl,
                failure: failureUrl,
                pending: pendingUrl,
              },
              auto_return: 'approved',
              metadata: {
                pack_id: pack.id,
                user_id: session.user.id,
              },
              // notification_url: `${appHost}/api/mercadopago/webhook` // Ensure this is HTTPS
            },
          })

          if (!preferenceResult.id) {
            throw new Error('Failed to create preference')
          }

          // Create pending payment record
          await db.insert(mercadopagoPayments).values({
            userId: session.user.id,
            packId: pack.id,
            preferenceId: preferenceResult.id,
            amountPaid: pack.price,
            currency: 'USD', // TODO: Make dynamic
            status: 'pending',
          })

          return new Response(JSON.stringify({ id: preferenceResult.id }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error creating MP preference:', error)
          return new Response(
            JSON.stringify({
              error: 'Failed to create Mercado Pago preference',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
