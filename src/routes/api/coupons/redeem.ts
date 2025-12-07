import { createFileRoute } from '@tanstack/react-router'
import { eq, and, sql, gt, isNull, or } from 'drizzle-orm'

import { db } from '@/db/index'
import { coupons, packRedemptions } from '@/db/schema'
import { auth } from '@/lib/auth'

interface RedeemCouponRequest {
  code: string
}

export const Route = createFileRoute('/api/coupons/redeem')({
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
          const body: RedeemCouponRequest = await request.json()
          const { code } = body

          console.log('Redeeming coupon code:', code)

          if (!code || typeof code !== 'string') {
            return new Response(
              JSON.stringify({ error: 'Coupon code is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Find the coupon
          const now = new Date()
          const [coupon] = await db
            .select()
            .from(coupons)
            .where(
              and(
                eq(coupons.code, code.trim().toUpperCase()),
                eq(coupons.isActive, true),
                or(isNull(coupons.expiresAt), gt(coupons.expiresAt, now)),
              ),
            )
            .limit(1)

          if (!coupon) {
            return new Response(
              JSON.stringify({
                error: 'Invalid coupon',
                message: 'Coupon not found, expired, or inactive.',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Check if max uses reached
          if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            return new Response(
              JSON.stringify({
                error: 'Coupon exhausted',
                message: 'This coupon has reached its maximum number of uses.',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Check if user already redeemed this coupon
          const existingRedemption = await db
            .select()
            .from(packRedemptions)
            .where(
              and(
                eq(packRedemptions.userId, userId),
                eq(packRedemptions.couponId, coupon.id),
              ),
            )
            .limit(1)

          if (existingRedemption.length > 0) {
            return new Response(
              JSON.stringify({
                error: 'Already redeemed',
                message: 'You have already redeemed this coupon.',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Record the redemption
          const [redemption] = await db
            .insert(packRedemptions)
            .values({
              userId,
              packId: null, // Coupons don't reference a pack
              source: 'coupon',
              couponId: coupon.id,
              giwayType: coupon.giwayType,
              participants: coupon.participants,
              images: coupon.images,
              emails: coupon.emails,
              amountPaid: 0, // Coupons are free
            })
            .returning()

          // Increment coupon used count
          await db
            .update(coupons)
            .set({
              usedCount: sql`${coupons.usedCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(coupons.id, coupon.id))

          return new Response(
            JSON.stringify({
              success: true,
              message: `Successfully redeemed coupon "${coupon.code}"`,
              redemptionId: redemption.id,
              rewards: {
                giwayType: coupon.giwayType,
                participants: coupon.participants,
                images: coupon.images,
                emails: coupon.emails,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Error redeeming coupon:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to redeem coupon' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
