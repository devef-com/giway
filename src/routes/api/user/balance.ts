import { createFileRoute } from '@tanstack/react-router'
import { eq, sql, and } from 'drizzle-orm'

import { db } from '@/db/index'
import { packRedemptions, balanceConsumptions } from '@/db/schema'
import { auth } from '@/lib/auth'

export interface UserBalanceResponse {
  playWithNumbers: {
    participants: number
    images: number
    emails: number
  }
  noNumbers: {
    participants: number
    images: number
    emails: number
  }
}

// Helper function to calculate user balance (can be reused in other files)
export async function calculateUserBalance(
  userId: string,
): Promise<UserBalanceResponse> {
  // Get all redemptions (credits) - grouped by giway type
  const redemptions = await db
    .select({
      giwayType: packRedemptions.giwayType,
      totalParticipants:
        sql<number>`COALESCE(SUM(${packRedemptions.participants}), 0)`.as(
          'total_participants',
        ),
      totalImages: sql<number>`COALESCE(SUM(${packRedemptions.images}), 0)`.as(
        'total_images',
      ),
      totalEmails: sql<number>`COALESCE(SUM(${packRedemptions.emails}), 0)`.as(
        'total_emails',
      ),
    })
    .from(packRedemptions)
    .where(
      and(
        eq(packRedemptions.userId, userId),
        sql`not ("source" = 'monthly' and "created_at" < date_trunc('month', NOW()))`,
      ),
    )
    .groupBy(packRedemptions.giwayType)

  // Get all consumptions (debits) - grouped by giway type
  const consumptions = await db
    .select({
      giwayType: balanceConsumptions.giwayType,
      totalParticipants:
        sql<number>`COALESCE(SUM(${balanceConsumptions.participants}), 0)`.as(
          'total_participants',
        ),
      totalImages:
        sql<number>`COALESCE(SUM(${balanceConsumptions.images}), 0)`.as(
          'total_images',
        ),
      totalEmails:
        sql<number>`COALESCE(SUM(${balanceConsumptions.emails}), 0)`.as(
          'total_emails',
        ),
    })
    .from(balanceConsumptions)
    .where(eq(balanceConsumptions.userId, userId))
    .groupBy(balanceConsumptions.giwayType)

  // Build response: redemptions - consumptions
  const response: UserBalanceResponse = {
    playWithNumbers: {
      participants: 0,
      images: 0,
      emails: 0,
    },
    noNumbers: {
      participants: 0,
      images: 0,
      emails: 0,
    },
  }

  // Add redemptions (credits)
  for (const r of redemptions) {
    if (r.giwayType === 'play_with_numbers') {
      response.playWithNumbers.participants += Number(r.totalParticipants)
      response.playWithNumbers.images += Number(r.totalImages)
      response.playWithNumbers.emails += Number(r.totalEmails)
    } else {
      response.noNumbers.participants += Number(r.totalParticipants)
      response.noNumbers.images += Number(r.totalImages)
      response.noNumbers.emails += Number(r.totalEmails)
    }
  }

  // Subtract consumptions (debits)
  for (const c of consumptions) {
    if (c.giwayType === 'play_with_numbers') {
      response.playWithNumbers.participants -= Number(c.totalParticipants)
      response.playWithNumbers.images -= Number(c.totalImages)
      response.playWithNumbers.emails -= Number(c.totalEmails)
    } else {
      response.noNumbers.participants -= Number(c.totalParticipants)
      response.noNumbers.images -= Number(c.totalImages)
      response.noNumbers.emails -= Number(c.totalEmails)
    }
  }

  // Ensure no negative values
  response.playWithNumbers.participants = Math.max(
    0,
    response.playWithNumbers.participants,
  )
  response.playWithNumbers.images = Math.max(0, response.playWithNumbers.images)
  response.playWithNumbers.emails = Math.max(0, response.playWithNumbers.emails)
  response.noNumbers.participants = Math.max(0, response.noNumbers.participants)
  response.noNumbers.images = Math.max(0, response.noNumbers.images)
  response.noNumbers.emails = Math.max(0, response.noNumbers.emails)

  return response
}

export const Route = createFileRoute('/api/user/balance')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const response = await calculateUserBalance(session.user.id)

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching user balance:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch user balance' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
