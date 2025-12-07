import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface AdStatusResponse {
  adsWatchedToday: number
  maxAdsPerDay: number
  adsRemaining: number
  rewardPerAd: {
    participants: number
    images: number
    emails: number
  }
}

interface RedeemAdResponse {
  success: boolean
  message: string
  redemptionId: number
  rewards: {
    giwayType: 'play_with_numbers' | 'no_numbers'
    participants: number
    images: number
    emails: number
  }
  adsRemaining: number
}

export function useAdStatus(enabled = true) {
  return useQuery<AdStatusResponse>({
    queryKey: ['adStatus'],
    queryFn: async () => {
      const response = await fetch('/api/ads/redeem')
      if (!response.ok) throw new Error('Failed to fetch ad status')
      return response.json()
    },
    enabled,
  })
}

export function useRedeemAd() {
  const queryClient = useQueryClient()

  return useMutation<RedeemAdResponse, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/ads/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.message || error.error || 'Failed to redeem ad reward',
        )
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate both ad status and user balance
      queryClient.invalidateQueries({ queryKey: ['adStatus'] })
      queryClient.invalidateQueries({ queryKey: ['userBalance'] })
    },
  })
}
