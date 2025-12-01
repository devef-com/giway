import { useMutation, useQueryClient } from '@tanstack/react-query'

interface GooglePayPaymentData {
  apiVersion: number
  apiVersionMinor: number
  paymentMethodData: {
    type: string
    description: string
    info: {
      cardNetwork: string
      cardDetails: string
    }
    tokenizationData: {
      type: string
      token: string
    }
  }
}

interface PurchasePackParams {
  packId: number
  paymentData: GooglePayPaymentData
}

interface PurchasePackResponse {
  success: boolean
  message: string
  redemptionId: number
  pack: {
    name: string
    participants: number
    images: number
    emails: number
  }
}

export function usePurchasePack() {
  const queryClient = useQueryClient()

  return useMutation<PurchasePackResponse, Error, PurchasePackParams>({
    mutationFn: async ({ packId, paymentData }) => {
      const response = await fetch('/api/packs/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packId, paymentData }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to purchase pack')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate user balance to refetch updated values
      queryClient.invalidateQueries({ queryKey: ['userBalance'] })
      queryClient.invalidateQueries({ queryKey: ['packs'] })
    },
  })
}
