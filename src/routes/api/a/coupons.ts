import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '@/db/index'
import { coupons } from '@/db/schema'
import { auth } from '@/lib/auth'

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN

export const Route = createFileRoute('/api/a/coupons')({
  server: {
    handlers: {
      // GET all coupons
      GET: async ({ request }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user?.id || session.user.email !== SUPER_ADMIN_EMAIL) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const allCoupons = await db
            .select()
            .from(coupons)
            .orderBy(coupons.createdAt)

          return new Response(JSON.stringify(allCoupons), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching coupons:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch coupons' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },

      // CREATE new coupon
      POST: async ({ request }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user?.id || session.user.email !== SUPER_ADMIN_EMAIL) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const body = await request.json()
          const {
            code,
            giwayType,
            participants,
            images,
            emails,
            maxUses,
            expiresAt,
            isActive,
          } = body

          if (!code || !giwayType) {
            return new Response(
              JSON.stringify({ error: 'Code and giwayType are required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const [newCoupon] = await db
            .insert(coupons)
            .values({
              code: code.trim().toUpperCase(),
              giwayType,
              participants: participants || 0,
              images: images || 0,
              emails: emails || 0,
              maxUses: maxUses || null,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
              isActive: isActive ?? true,
            })
            .returning()

          return new Response(JSON.stringify(newCoupon), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error: any) {
          console.error('Error creating coupon:', error)
          if (error?.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'Coupon code already exists' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }
          return new Response(
            JSON.stringify({ error: 'Failed to create coupon' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },

      // UPDATE coupon
      PUT: async ({ request }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user?.id || session.user.email !== SUPER_ADMIN_EMAIL) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const body = await request.json()
          const {
            id,
            code,
            giwayType,
            participants,
            images,
            emails,
            maxUses,
            expiresAt,
            isActive,
          } = body

          if (!id) {
            return new Response(
              JSON.stringify({ error: 'Coupon ID is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const [updatedCoupon] = await db
            .update(coupons)
            .set({
              code: code?.trim().toUpperCase(),
              giwayType,
              participants,
              images,
              emails,
              maxUses: maxUses || null,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
              isActive,
              updatedAt: new Date(),
            })
            .where(eq(coupons.id, id))
            .returning()

          if (!updatedCoupon) {
            return new Response(JSON.stringify({ error: 'Coupon not found' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify(updatedCoupon), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error: any) {
          console.error('Error updating coupon:', error)
          if (error?.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'Coupon code already exists' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }
          return new Response(
            JSON.stringify({ error: 'Failed to update coupon' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },

      // DELETE coupon
      DELETE: async ({ request }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user?.id || session.user.email !== SUPER_ADMIN_EMAIL) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const url = new URL(request.url)
          const id = url.searchParams.get('id')

          if (!id) {
            return new Response(
              JSON.stringify({ error: 'Coupon ID is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const [deletedCoupon] = await db
            .delete(coupons)
            .where(eq(coupons.id, parseInt(id)))
            .returning()

          if (!deletedCoupon) {
            return new Response(JSON.stringify({ error: 'Coupon not found' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error deleting coupon:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to delete coupon' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
