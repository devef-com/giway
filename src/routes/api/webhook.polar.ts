// Polar Webhooks handler for TanStack Start
// See: https://polar.sh/docs/integrate/sdk/adapters/tanstack-start
import { Webhooks } from '@polar-sh/tanstack-start'
import { createFileRoute } from '@tanstack/react-router'
import { eq, and, sql } from 'drizzle-orm'

import { db } from '@/db/index'
import { packs, userBalances, packRedemptions } from '@/db/schema'

export const Route = createFileRoute('/api/webhook/polar')({
  server: {
    handlers: {
      POST: Webhooks({
        webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
        onOrderPaid: async (payload) => {
          // Handle successful payment
          console.log('Polar order paid:', payload)

          // Extract userId from metadata and productId from order
          const metadata = payload.data.metadata as {
            packId?: string
            userId?: string
          } | null

          if (!metadata?.userId) {
            console.error('Missing userId in Polar webhook payload metadata')
            return
          }

          const userId = metadata.userId

          // Get product ID from the order items
          // Polar sends product info in the order
          const productId = payload.data.product?.id

          if (!productId) {
            console.error('Missing product ID in Polar webhook payload')
            return
          }

          // Look up pack by polarId (the Polar product ID stored in DB)
          const [pack] = await db
            .select()
            .from(packs)
            .where(and(eq(packs.polarId, productId), eq(packs.isActive, true)))
            .limit(1)

          if (!pack) {
            console.error('Pack not found for Polar product:', productId)
            return
          }

          // Record the pack redemption
          await db.insert(packRedemptions).values({
            userId,
            packId: pack.id,
            source: 'purchase',
            giwayType: pack.giwayType,
            participants: pack.participants,
            images: pack.images,
            emails: pack.emails,
            amountPaid: pack.price,
          })

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
            await db.insert(userBalances).values({
              userId,
              giwayType: pack.giwayType,
              participants: pack.participants,
              images: pack.images,
              emails: pack.emails,
            })
          }

          console.log(`Successfully processed pack purchase for user ${userId}`)
        },
        onPayload: async (payload) => {
          // Catch-all handler for debugging
          console.log('Polar webhook received:', payload.type)
        },
      }),
    },
  },
})
