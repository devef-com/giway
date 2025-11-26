import { createFileRoute } from '@tanstack/react-router'
import { eq, sql, and, ilike, isNull, asc, desc } from 'drizzle-orm'

import { db } from '@/db/index'
import { numberSlots, participants } from '@/db/schema'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'
type SortField = 'name' | 'createdAt' | 'number' | 'status'
type SortOrder = 'asc' | 'desc'

export const Route = createFileRoute('/api/drawings/$drawingId/participants')({
  server: {
    handlers: {
      GET: async ({
        params,
        request,
      }: {
        params: { drawingId: string }
        request: Request
      }) => {
        try {
          const url = new URL(request.url)

          // Parse query parameters
          const status = (url.searchParams.get('status') ||
            'all') as StatusFilter
          const name = url.searchParams.get('name') || ''
          const page = parseInt(url.searchParams.get('page') || '1', 10)
          const limit = parseInt(url.searchParams.get('limit') || '100', 10)
          const sortBy = (url.searchParams.get('sortBy') ||
            'createdAt') as SortField
          const sortOrder = (url.searchParams.get('sortOrder') ||
            'desc') as SortOrder

          const offset = (page - 1) * limit

          // Build where conditions
          const conditions = [eq(participants.drawingId, params.drawingId)]

          // Status filter
          if (status === 'pending') {
            conditions.push(isNull(participants.isEligible))
          } else if (status === 'approved') {
            conditions.push(eq(participants.isEligible, true))
          } else if (status === 'rejected') {
            conditions.push(eq(participants.isEligible, false))
          }

          // Name search (case-insensitive)
          if (name.trim()) {
            conditions.push(ilike(participants.name, `%${name.trim()}%`))
          }

          // Build sort order
          const getSortColumn = (field: SortField) => {
            switch (field) {
              case 'name':
                return participants.name
              case 'status':
                return participants.isEligible
              case 'createdAt':
              default:
                return participants.createdAt
            }
          }

          const sortColumn = getSortColumn(sortBy)
          const orderByClause =
            sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

          // Get total count for pagination
          const countResult = await db
            .select({ count: sql<number>`count(distinct ${participants.id})` })
            .from(participants)
            .where(and(...conditions))

          const total = Number(countResult[0]?.count || 0)

          // Get paginated participants
          const drawingParticipants = await db
            .select({
              id: participants.id,
              drawingId: participants.drawingId,
              name: participants.name,
              email: participants.email,
              phone: participants.phone,
              selectedNumber: participants.selectedNumber,
              logNumbers: participants.logNumbers,
              isEligible: participants.isEligible,
              paymentCaptureId: participants.paymentCaptureId,
              createdAt: participants.createdAt,
              numbers: sql<
                Array<number>
              >`array_agg(${numberSlots.number}) filter (where ${numberSlots.number} is not null)`.as(
                'numbers',
              ),
            })
            .from(participants)
            .leftJoin(
              numberSlots,
              eq(numberSlots.participantId, participants.id),
            )
            .where(and(...conditions))
            .groupBy(participants.id)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset)

          return new Response(
            JSON.stringify({
              data: drawingParticipants,
              pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + drawingParticipants.length < total,
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        } catch (error) {
          console.error('Error fetching participants:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch participants' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
