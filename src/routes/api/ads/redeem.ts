import { createFileRoute } from '@tanstack/react-router'
import { eq, and, gte, sql } from 'drizzle-orm'

import { db } from '@/db/index'
import { packRedemptions } from '@/db/schema'
import { auth } from '@/lib/auth'

// Configuration for ad rewards
const AD_REWARD_CONFIG = {
  participantsPerAd: 10, // Participants earned per ad watched
  imagesPerAd: 0, // Images earned per ad
  emailsPerAd: 0, // Emails earned per ad
  maxAdsPerDay: 5, // Maximum ads a user can watch per day
  giwayType: 'play_with_numbers' as const, // Ads only work for raffles
}

export const Route = createFileRoute('/api/ads/redeem')({
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

          // Check how many ads user has watched today
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          const todayRedemptions = await db
            .select({
              count: sql<number>`COUNT(*)`.as('count'),
            })
            .from(packRedemptions)
            .where(
              and(
                eq(packRedemptions.userId, userId),
                eq(packRedemptions.source, 'ads'),
                gte(packRedemptions.createdAt, today),
              ),
            )

          const adsWatchedToday = Number(todayRedemptions[0]?.count || 0)

          if (adsWatchedToday >= AD_REWARD_CONFIG.maxAdsPerDay) {
            return new Response(
              JSON.stringify({
                error: 'Daily limit reached',
                message: `You have reached the maximum of ${AD_REWARD_CONFIG.maxAdsPerDay} ads per day. Come back tomorrow!`,
                adsWatchedToday,
                maxAdsPerDay: AD_REWARD_CONFIG.maxAdsPerDay,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // TODO: Verify ad was actually watched with your ad provider
          // This should integrate with AdMob, Unity Ads, or similar
          // For now, we trust the client but in production you MUST verify

          // Record the ad reward redemption
          const [redemption] = await db
            .insert(packRedemptions)
            .values({
              userId,
              packId: null, // Ads don't reference a pack
              source: 'ads',
              couponId: null,
              giwayType: AD_REWARD_CONFIG.giwayType,
              participants: AD_REWARD_CONFIG.participantsPerAd,
              images: AD_REWARD_CONFIG.imagesPerAd,
              emails: AD_REWARD_CONFIG.emailsPerAd,
              amountPaid: 0,
            })
            .returning()

          return new Response(
            JSON.stringify({
              success: true,
              message: `Earned ${AD_REWARD_CONFIG.participantsPerAd} participants for watching an ad!`,
              redemptionId: redemption.id,
              rewards: {
                giwayType: AD_REWARD_CONFIG.giwayType,
                participants: AD_REWARD_CONFIG.participantsPerAd,
                images: AD_REWARD_CONFIG.imagesPerAd,
                emails: AD_REWARD_CONFIG.emailsPerAd,
              },
              adsRemaining:
                AD_REWARD_CONFIG.maxAdsPerDay - (adsWatchedToday + 1),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Error processing ad reward:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to process ad reward' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },

      // GET endpoint to check remaining ads for today
      GET: async ({ request }) => {
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

          const userId = session.user.id

          // Check how many ads user has watched today
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          const todayRedemptions = await db
            .select({
              count: sql<number>`COUNT(*)`.as('count'),
            })
            .from(packRedemptions)
            .where(
              and(
                eq(packRedemptions.userId, userId),
                eq(packRedemptions.source, 'ads'),
                gte(packRedemptions.createdAt, today),
              ),
            )

          const adsWatchedToday = Number(todayRedemptions[0]?.count || 0)

          return new Response(
            JSON.stringify({
              adsWatchedToday,
              maxAdsPerDay: AD_REWARD_CONFIG.maxAdsPerDay,
              adsRemaining: Math.max(
                0,
                AD_REWARD_CONFIG.maxAdsPerDay - adsWatchedToday,
              ),
              rewardPerAd: {
                participants: AD_REWARD_CONFIG.participantsPerAd,
                images: AD_REWARD_CONFIG.imagesPerAd,
                emails: AD_REWARD_CONFIG.emailsPerAd,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Error fetching ad status:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch ad status' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
