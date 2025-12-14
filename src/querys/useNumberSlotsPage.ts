import { useQuery } from '@tanstack/react-query'

export interface NumberSlotsPageData {
  slots: Array<{
    number: number
    status: 'available' | 'reserved' | 'taken'
    participantName?: string
    expiresAt?: string
  }>
  totalCount?: number
  availableCount?: number
  takenCount?: number
  reservedCount?: number
  hasMore?: boolean
  nextPage?: number
}

export function getNumberSlotsPageQueryKey(
  drawingId: string,
  page: number,
  pageSize: number,
) {
  return ['number-slots-page', drawingId, page, pageSize] as const
}

export async function fetchNumberSlotsPage(
  drawingId: string,
  page: number,
  pageSize: number,
): Promise<NumberSlotsPageData> {
  const response = await fetch(
    `/api/drawings/${drawingId}/slots?page=${page}&pageSize=${pageSize}`,
  )
  if (!response.ok) throw new Error('Failed to fetch slots')
  return response.json()
}

export function useNumberSlotsPage(
  drawingId: string,
  page: number,
  pageSize: number,
  enabled = true,
  options?: {
    staleTime?: number
    refetchOnWindowFocus?: boolean
  },
) {
  return useQuery<NumberSlotsPageData>({
    queryKey: getNumberSlotsPageQueryKey(drawingId, page, pageSize),
    queryFn: () => fetchNumberSlotsPage(drawingId, page, pageSize),
    enabled,
    staleTime: options?.staleTime,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  })
}
