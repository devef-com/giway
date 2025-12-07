import { useMutation, useQueryClient } from '@tanstack/react-query'

interface RedeemCouponParams {
  code: string
}

interface RedeemCouponResponse {
  success: boolean
  message: string
  redemptionId: number
  rewards: {
    giwayType: 'play_with_numbers' | 'no_numbers'
    participants: number
    images: number
    emails: number
  }
}

export function useRedeemCoupon() {
  const queryClient = useQueryClient()

  return useMutation<RedeemCouponResponse, Error, RedeemCouponParams>({
    mutationFn: async ({ code }) => {
      const response = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.log(response)
        throw new Error(
          error.message || error.error || 'Failed to redeem coupon',
        )
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate user balance to refetch updated values
      queryClient.invalidateQueries({ queryKey: ['userBalance'] })
    },
  })
}
