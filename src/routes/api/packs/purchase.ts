import { createFileRoute } from '@tanstack/react-router'
import { eq, and, sql } from 'drizzle-orm'

import { db } from '@/db/index'
import { packs, userBalances, packRedemptions } from '@/db/schema'
import { auth } from '@/lib/auth'

// Type for Google Pay payment token
interface GooglePayPaymentData {
  apiVersion: number
  apiVersionMinor: number
  paymentMethodData: {
    type: string
    description: string
    info: {
      cardNetwork: string
      cardDetails: string
    }
    tokenizationData: {
      type: string
      token: string
    }
  }
}

interface PurchaseRequest {
  packId: number
  paymentData: GooglePayPaymentData
}

export const Route = createFileRoute('/api/packs/purchase')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Get authenticated user
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const userId = session.user.id
          const body: PurchaseRequest = await request.json()
          const { packId, paymentData } = body

          if (!packId || !paymentData) {
            return new Response(
              JSON.stringify({ error: 'Missing packId or paymentData' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Get the pack details
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

          // TODO: Verify the payment token with your payment gateway
          // This is where you would integrate with Stripe, Braintree, etc.
          // to process the actual payment using the token from Google Pay
          //
          // Example with Stripe:
          // const charge = await stripe.charges.create({
          //   amount: pack.price,
          //   currency: 'usd',
          //   source: paymentData.paymentMethodData.tokenizationData.token,
          //   description: `Purchase of ${pack.name}`,
          // })
          //
          // For now, we'll simulate a successful payment in TEST mode
          console.log('Processing Google Pay payment:', {
            packId,
            packName: pack.name,
            amount: pack.price,
            cardNetwork: paymentData.paymentMethodData?.info?.cardNetwork,
            cardDetails: paymentData.paymentMethodData?.info?.cardDetails,
          })

          // Simulate payment processing delay
          await new Promise((resolve) => setTimeout(resolve, 500))

          // Record the pack redemption
          const [redemption] = await db
            .insert(packRedemptions)
            .values({
              userId,
              packId: pack.id,
              source: 'purchase',
              giwayType: pack.giwayType,
              participants: pack.participants,
              images: pack.images,
              emails: pack.emails,
              amountPaid: pack.price,
            })
            .returning()

          // Update or create user balance
          const existingBalance = await db
            .select()
            .from(userBalances)
            .where(
              and(
                eq(userBalances.userId, userId),
                eq(userBalances.giwayType, pack.giwayType),
              ),
            )
            .limit(1)

          if (existingBalance.length > 0) {
            // Update existing balance
            await db
              .update(userBalances)
              .set({
                participants: sql`${userBalances.participants} + ${pack.participants}`,
                images: sql`${userBalances.images} + ${pack.images}`,
                emails: sql`${userBalances.emails} + ${pack.emails}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(userBalances.userId, userId),
                  eq(userBalances.giwayType, pack.giwayType),
                ),
              )
          } else {
            // Create new balance
            await db.insert(userBalances).values({
              userId,
              giwayType: pack.giwayType,
              participants: pack.participants,
              images: pack.images,
              emails: pack.emails,
            })
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: `Successfully purchased ${pack.name}`,
              redemptionId: redemption.id,
              pack: {
                name: pack.name,
                participants: pack.participants,
                images: pack.images,
                emails: pack.emails,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Error processing purchase:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to process purchase' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
