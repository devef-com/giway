import { createFileRoute } from '@tanstack/react-router'
import { eq, and, gte, sql } from 'drizzle-orm'

import { db } from '@/db/index'
import { packRedemptions } from '@/db/schema'
import { auth } from '@/lib/auth'

// Monthly allowance configuration (only for play_with_numbers)
const MONTHLY_ALLOWANCE = {
  participants: 200,
  images: 1,
  emails: 0,
  giwayType: 'play_with_numbers' as const,
}

// Helper to get start of current month
function getStartOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
}

// Helper to check and grant monthly allowance
export async function checkAndGrantMonthlyAllowance(userId: string): Promise<{
  granted: boolean
  alreadyClaimed: boolean
  allowance: typeof MONTHLY_ALLOWANCE | null
}> {
  const startOfMonth = getStartOfMonth()

  // Check if user already claimed this month
  const existingClaim = await db
    .select({
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(packRedemptions)
    .where(
      and(
        eq(packRedemptions.userId, userId),
        eq(packRedemptions.source, 'monthly'),
        gte(packRedemptions.createdAt, startOfMonth),
      ),
    )

  const alreadyClaimed = Number(existingClaim[0]?.count || 0) > 0

  if (alreadyClaimed) {
    return {
      granted: false,
      alreadyClaimed: true,
      allowance: null,
    }
  }

  // Grant the monthly allowance
  await db.insert(packRedemptions).values({
    userId,
    packId: null,
    source: 'monthly',
    couponId: null,
    giwayType: MONTHLY_ALLOWANCE.giwayType,
    participants: MONTHLY_ALLOWANCE.participants,
    images: MONTHLY_ALLOWANCE.images,
    emails: MONTHLY_ALLOWANCE.emails,
    amountPaid: 0,
  })

  return {
    granted: true,
    alreadyClaimed: false,
    allowance: MONTHLY_ALLOWANCE,
  }
}

export const Route = createFileRoute('/api/user/monthly-allowance')({
  server: {
    handlers: {
      // GET - Check status of monthly allowance
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

          const startOfMonth = getStartOfMonth()

          // Check if user already claimed this month
          const existingClaim = await db
            .select()
            .from(packRedemptions)
            .where(
              and(
                eq(packRedemptions.userId, session.user.id),
                eq(packRedemptions.source, 'monthly'),
                gte(packRedemptions.createdAt, startOfMonth),
              ),
            )
            .limit(1)

          const claimed = existingClaim.length > 0

          return new Response(
            JSON.stringify({
              claimed,
              claimedAt: claimed ? existingClaim[0].createdAt : null,
              allowance: MONTHLY_ALLOWANCE,
              currentMonth: startOfMonth.toISOString(),
              message: claimed
                ? 'Monthly allowance already claimed for this month.'
                : 'Monthly allowance available! Claim it now.',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Error checking monthly allowance:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to check monthly allowance' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },

      // POST - Claim monthly allowance
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

          const result = await checkAndGrantMonthlyAllowance(session.user.id)

          if (result.alreadyClaimed) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Already claimed',
                message:
                  'You have already claimed your monthly allowance for this month.',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Monthly allowance claimed successfully!',
              rewards: result.allowance,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          console.error('Error claiming monthly allowance:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to claim monthly allowance' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
