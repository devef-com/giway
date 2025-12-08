import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Participant } from '@/db/schema'

interface ParticipateData {
  name: string
  email: string
  phone: string
  selectedNumbers?: Array<number>
  paymentCaptureId?: number
}

export function useParticipate(
  drawingId: string,
  onSuccess?: (data: Participant) => void,
  onError?: (error: Error) => void,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ParticipateData) => {
      const response = await fetch(`/api/drawings/${drawingId}/participate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to register')
      }

      return response.json()
    },
    onSuccess: (data: Participant) => {
      toast.success('Successfully registered for the drawing!')
      queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
      queryClient.invalidateQueries({ queryKey: ['drawing-stats', drawingId] })
      onSuccess?.(data)
    },
    onError: (error: Error) => {
      toast.error(error.message)
      onError?.(error)
    },
  })
}
