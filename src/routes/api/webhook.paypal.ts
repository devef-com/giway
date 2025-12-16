import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '@/db/index'
import { packRedemptions, packs, paypalPayments } from '@/db/schema'
import {
  centsToUsdString,
  getPayPalAccessToken,
  getPayPalBaseUrl,
} from '@/lib/paypal'

type PayPalWebhookEvent = {
  event_type?: string
  resource?: any
}

function requireWebhookId() {
  const id = process.env.PAYPAL_WEBHOOK_ID
  if (!id) throw new Error('Missing PAYPAL_WEBHOOK_ID')
  return id
}

async function verifyPayPalWebhookSignature(
  request: Request,
  webhookEvent: any,
) {
  const webhookId = requireWebhookId()

  const transmissionId = request.headers.get('paypal-transmission-id')
  const transmissionTime = request.headers.get('paypal-transmission-time')
  const certUrl = request.headers.get('paypal-cert-url')
  const authAlgo = request.headers.get('paypal-auth-algo')
  const transmissionSig = request.headers.get('paypal-transmission-sig')

  if (
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    return { ok: false as const, reason: 'Missing PayPal webhook headers' }
  }

  const accessToken = await getPayPalAccessToken()
  const baseUrl = getPayPalBaseUrl()

  const verifyRes = await fetch(
    `${baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    },
  )

  if (!verifyRes.ok) {
    const text = await verifyRes.text().catch(() => '')
    return {
      ok: false as const,
      reason: `Verify call failed: ${verifyRes.status} ${text}`,
    }
  }

  const data = (await verifyRes.json()) as { verification_status?: string }
  if (data.verification_status !== 'SUCCESS') {
    return {
      ok: false as const,
      reason: `Invalid signature: ${data.verification_status}`,
    }
  }

  return { ok: true as const }
}

export const Route = createFileRoute('/api/webhook/paypal')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.text()
          const event = JSON.parse(raw) as PayPalWebhookEvent

          const verification = await verifyPayPalWebhookSignature(
            request,
            event,
          )

          if (!verification.ok) {
            console.warn(
              'PayPal webhook signature rejected:',
              verification.reason,
            )
            return new Response(JSON.stringify({ ok: false }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const eventType = event.event_type

          if (!eventType) {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
            const orderId =
              event.resource?.supplementary_data?.related_ids?.order_id
            const captureId = event.resource?.id
            const capturedAmount = event.resource?.amount

            if (orderId) {
              const [payment] = await db
                .select()
                .from(paypalPayments)
                .where(eq(paypalPayments.paypalOrderId, orderId))
                .limit(1)

              if (payment) {
                await db.transaction(async (tx) => {
                  const expectedValue = centsToUsdString(payment.amountPaid)
                  const actualValue = capturedAmount?.value
                  const actualCurrency = capturedAmount?.currency_code

                  if (actualCurrency && actualCurrency !== payment.currency) {
                    await tx
                      .update(paypalPayments)
                      .set({
                        status: 'CURRENCY_MISMATCH',
                        updatedAt: new Date(),
                      })
                      .where(eq(paypalPayments.id, payment.id))
                    return
                  }

                  if (actualValue && actualValue !== expectedValue) {
                    await tx
                      .update(paypalPayments)
                      .set({ status: 'AMOUNT_MISMATCH', updatedAt: new Date() })
                      .where(eq(paypalPayments.id, payment.id))
                    return
                  }

                  await tx
                    .update(paypalPayments)
                    .set({
                      status: 'CAPTURED',
                      paypalCaptureId: captureId,
                      updatedAt: new Date(),
                    })
                    .where(eq(paypalPayments.id, payment.id))

                  if (!payment.packId) return

                  const existing = await tx
                    .select({ id: packRedemptions.id })
                    .from(packRedemptions)
                    .where(eq(packRedemptions.paypalPaymentId, payment.id))
                    .limit(1)

                  if (existing.length > 0) return

                  const [pack] = await tx
                    .select()
                    .from(packs)
                    .where(eq(packs.id, payment.packId))
                    .limit(1)

                  if (!pack) return

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
              }
            }
          }

          if (eventType === 'PAYMENT.CAPTURE.DENIED') {
            const orderId =
              event.resource?.supplementary_data?.related_ids?.order_id

            if (orderId) {
              await db
                .update(paypalPayments)
                .set({ status: 'DENIED', updatedAt: new Date() })
                .where(eq(paypalPayments.paypalOrderId, orderId))
            }
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error handling PayPal webhook:', error)
          return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
