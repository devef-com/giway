import { useQuery } from '@tanstack/react-query'
import type { DrawingStats } from '@/lib/number-slots'

export function useDrawingStats(
  drawingId: string,
  enabled = true,
  refetchInterval?: number,
) {
  return useQuery<DrawingStats>({
    queryKey: ['drawing-stats', drawingId],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/${drawingId}/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
    enabled,
    refetchInterval,
  })
}
