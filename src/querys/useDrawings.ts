import { useQuery } from '@tanstack/react-query'

export function useDrawings(enabled = true) {
  return useQuery({
    queryKey: ['drawings'],
    queryFn: async () => {
      const response = await fetch('/api/drawings')
      if (!response.ok) throw new Error('Failed to fetch drawings')
      return response.json()
    },
    enabled,
  })
}
