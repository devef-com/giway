import { useQuery } from '@tanstack/react-query'

interface ReservationTimeData {
  reservationTimeMinutes: number
}

export function useReservationTime() {
  return useQuery<ReservationTimeData>({
    queryKey: ['reservation-time'],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/reservation-time`)
      if (!response.ok) throw new Error('Failed to fetch reservation time')
      return response.json()
    },
  })
}
