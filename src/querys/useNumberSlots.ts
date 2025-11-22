import { useQuery } from '@tanstack/react-query'

interface NumberSlotsData {
  slots: Array<{
    number: number
    status: 'available' | 'reserved' | 'taken'
    participantName?: string
    expiresAt?: string
  }>
}

export function useNumberSlots(
  drawingId: string,
  numbers: Array<number>,
  enabled = true,
  options?: {
    staleTime?: number
    refetchOnWindowFocus?: boolean
    queryKey?: Array<string | number>
  },
) {
  // Sort numbers to ensure consistent query keys and API calls
  const sortedNumbers = [...numbers].sort((a, b) => a - b)
  
  return useQuery<NumberSlotsData>({
    queryKey: options?.queryKey || ['number-slots', drawingId, ...sortedNumbers],
    queryFn: async () => {
      const response = await fetch(
        `/api/drawings/${drawingId}/slots?numbers=${sortedNumbers.join(',')}`,
      )
      if (!response.ok) throw new Error('Failed to fetch slots')
      return response.json()
    },
    enabled,
    staleTime: options?.staleTime,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  })
}
