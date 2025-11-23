import { useQuery } from '@tanstack/react-query'

// Hook for fetching participants with authentication
export function useParticipants(drawingId: string, enabled = true) {
  return useQuery({
    queryKey: ['participants', drawingId],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/${drawingId}/participants`)
      if (!response.ok) throw new Error('Failed to fetch participants')
      return response.json()
    },
    enabled,
  })
}
