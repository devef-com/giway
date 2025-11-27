import { Participant } from '@/db/schema'
import { useInfiniteQuery } from '@tanstack/react-query'

export type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'
export type SortField = 'name' | 'createdAt' | 'number' | 'status'
export type SortOrder = 'asc' | 'desc'

export interface ParticipantsFilters {
  status?: StatusFilter
  name?: string
  limit?: number
  sortBy?: SortField
  sortOrder?: SortOrder
}

export interface ParticipantsResponse {
  data: (Participant & { numbers: number[] })[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

// Hook for fetching participants with authentication
export function useParticipants(
  drawingId: string,
  enabled = true,
  filters: ParticipantsFilters = {},
) {
  const {
    status = 'all',
    name = '',
    limit = 100,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters

  return useInfiniteQuery<ParticipantsResponse>({
    queryKey: [
      'participants',
      drawingId,
      { status, name, limit, sortBy, sortOrder },
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        status,
        name,
        page: String(pageParam),
        limit: String(limit),
        sortBy,
        sortOrder,
      })

      const response = await fetch(
        `/api/drawings/${drawingId}/participants?${params}`,
      )
      if (!response.ok) throw new Error('Failed to fetch participants')
      return response.json()
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    enabled,
  })
}
