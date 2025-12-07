import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface MonthlyAllowanceStatusResponse {
  claimed: boolean
  claimedAt: string | null
  allowance: {
    participants: number
    images: number
    emails: number
    giwayType: 'play_with_numbers'
  }
  currentMonth: string
  message: string
}

interface ClaimMonthlyAllowanceResponse {
  success: boolean
  message: string
  rewards: {
    participants: number
    images: number
    emails: number
    giwayType: 'play_with_numbers'
  }
}

export function useMonthlyAllowanceStatus(enabled = true) {
  return useQuery<MonthlyAllowanceStatusResponse>({
    queryKey: ['monthlyAllowance'],
    queryFn: async () => {
      const response = await fetch('/api/user/monthly-allowance')
      if (!response.ok)
        throw new Error('Failed to fetch monthly allowance status')
      return response.json()
    },
    enabled,
  })
}

export function useClaimMonthlyAllowance() {
  const queryClient = useQueryClient()

  return useMutation<ClaimMonthlyAllowanceResponse, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/user/monthly-allowance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.message || error.error || 'Failed to claim monthly allowance',
        )
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate both monthly allowance status and user balance
      queryClient.invalidateQueries({ queryKey: ['monthlyAllowance'] })
      queryClient.invalidateQueries({ queryKey: ['userBalance'] })
    },
  })
}
