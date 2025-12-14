import { createFileRoute } from '@tanstack/react-router'
import { getNumberSlots } from '@/lib/number-slots'

/**
 * GET /api/drawings/:drawingId/slots
 *
 * Returns slot status for specific numbers OR for a page.
 *
 * Query params:
 * - Specific numbers: ?numbers=1,2,3,4,5
 * - Pagination: ?page=1&pageSize=100
 */
export const Route = createFileRoute('/api/drawings/$drawingId/slots')({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request
        params: { drawingId: string }
      }) => {
        try {
          const url = new URL(request.url)
          const numbersParam = url.searchParams.get('numbers')
          const pageParam = url.searchParams.get('page')
          const pageSizeParam = url.searchParams.get('pageSize')

          const hasNumbersQuery = !!numbersParam && numbersParam.length > 0
          const hasPaginationQuery = !!pageParam || !!pageSizeParam

          if (!hasNumbersQuery && !hasPaginationQuery) {
            return new Response(
              JSON.stringify({
                error:
                  'Missing query. Provide either numbers or page/pageSize.',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const result = hasNumbersQuery
            ? await (async () => {
                const numbers = numbersParam!.split(',').map(Number)

                return getNumberSlots({
                  drawingId: params.drawingId,
                  numbers,
                  pageSize: numbers.length,
                })
              })()
            : await (async () => {
                const page = Math.max(1, Number(pageParam ?? '1') || 1)
                const pageSize = Math.min(
                  1000,
                  Math.max(1, Number(pageSizeParam ?? '100') || 100),
                )

                return getNumberSlots({
                  drawingId: params.drawingId,
                  page,
                  pageSize,
                })
              })()

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching slots:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch slots' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
