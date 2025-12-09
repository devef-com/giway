import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Comment {
  id: number
  comment: string
  authorName: string
  authorType: 'host' | 'participant'
  isVisibleToParticipant: boolean
  createdAt: string
}

interface CommentsResponse {
  comments: Comment[]
}

interface AddCommentRequest {
  comment: string
  isVisibleToParticipant: boolean
}

export function useParticipantComments(participantId: number, enabled = true) {
  return useQuery<CommentsResponse>({
    queryKey: ['participant-comments', participantId],
    queryFn: async () => {
      const response = await fetch(`/api/participant/${participantId}/comments`)
      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }
      return response.json()
    },
    enabled,
  })
}

export function useAddParticipantComment(participantId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AddCommentRequest) => {
      const response = await fetch(
        `/api/participant/${participantId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add comment')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['participant-comments', participantId],
      })
    },
  })
}
