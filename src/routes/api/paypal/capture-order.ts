import { createFileRoute } from '@tanstack/react-router'
import { and, eq, ne } from 'drizzle-orm'

import { auth } from '@/lib/auth'
import { db } from '@/db/index'
import { packRedemptions, packs, paypalPayments } from '@/db/schema'
import {
  centsToUsdString,
  getPayPalAccessToken,
  getPayPalBaseUrl,
} from '@/lib/paypal'

interface CaptureOrderBody {
  orderId: string
}

export const Route = createFileRoute('/api/paypal/capture-order')({
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

          const body = (await request.json()) as Partial<CaptureOrderBody>
          const orderId = body.orderId

          if (!orderId) {
            return new Response(JSON.stringify({ error: 'Missing orderId' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const [payment] = await db
            .select()
            .from(paypalPayments)
            .where(
              and(
                eq(paypalPayments.paypalOrderId, orderId),
                eq(paypalPayments.userId, session.user.id),
              ),
            )
            .limit(1)

          if (!payment) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          if (payment.status === 'CAPTURED') {
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const accessToken = await getPayPalAccessToken()
          const baseUrl = getPayPalBaseUrl()

          const captureRes = await fetch(
            `${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          )

          if (!captureRes.ok) {
            const text = await captureRes.text().catch(() => '')
            console.error('PayPal capture failed:', captureRes.status, text)
            return new Response(
              JSON.stringify({ error: 'Failed to capture PayPal order' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const captureData = (await captureRes.json()) as {
            status?: string
            payer?: { payer_id?: string }
            purchase_units?: Array<{
              payments?: {
                captures?: Array<{
                  id?: string
                  status?: string
                  amount?: { currency_code?: string; value?: string }
                }>
              }
            }>
          }

          if (captureData.status !== 'COMPLETED') {
            await db
              .update(paypalPayments)
              .set({
                status: captureData.status ?? 'UNKNOWN',
                payerId: captureData.payer?.payer_id,
                updatedAt: new Date(),
              })
              .where(eq(paypalPayments.id, payment.id))

            return new Response(
              JSON.stringify({ error: 'Payment not completed' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const captureId =
            captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id

          const capturedAmount =
            captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount
          const expectedValue = centsToUsdString(payment.amountPaid)
          const actualValue = capturedAmount?.value
          const actualCurrency = capturedAmount?.currency_code

          if (actualCurrency && actualCurrency !== payment.currency) {
            await db
              .update(paypalPayments)
              .set({ status: 'CURRENCY_MISMATCH', updatedAt: new Date() })
              .where(eq(paypalPayments.id, payment.id))

            return new Response(
              JSON.stringify({ error: 'Currency mismatch' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          if (actualValue && actualValue !== expectedValue) {
            await db
              .update(paypalPayments)
              .set({ status: 'AMOUNT_MISMATCH', updatedAt: new Date() })
              .where(eq(paypalPayments.id, payment.id))

            return new Response(JSON.stringify({ error: 'Amount mismatch' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          await db.transaction(async (tx) => {
            const updated = await tx
              .update(paypalPayments)
              .set({
                status: 'CAPTURED',
                paypalCaptureId: captureId,
                payerId: captureData.payer?.payer_id,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(paypalPayments.id, payment.id),
                  ne(paypalPayments.status, 'CAPTURED'),
                ),
              )
              .returning({ id: paypalPayments.id })

            // If another request already captured it, do nothing.
            if (updated.length === 0) return

            if (!payment.packId) return

            const [pack] = await tx
              .select()
              .from(packs)
              .where(eq(packs.id, payment.packId))
              .limit(1)

            if (!pack) return

            // Insert the actual balance grant only after capture
            const existing = await tx
              .select({ id: packRedemptions.id })
              .from(packRedemptions)
              .where(eq(packRedemptions.paypalPaymentId, payment.id))
              .limit(1)

            if (existing.length > 0) return

            await tx.insert(packRedemptions).values({
              userId: payment.userId,
              packId: pack.id,
              paypalPaymentId: payment.id,
              source: 'purchase',
              giwayType: pack.giwayType,
              participants: pack.participants,
              images: pack.images,
              emails: pack.emails,
              amountPaid: payment.amountPaid,
            })
          })

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error capturing PayPal order:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to capture PayPal order' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
