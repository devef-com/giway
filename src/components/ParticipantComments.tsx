import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  useParticipantComments,
  useAddParticipantComment,
} from '@/querys/useParticipantComments'
import { Skeleton } from '@/components/ui/skeleton'

export function ParticipantComments({
  participantId,
}: {
  participantId: string
}) {
  const { t } = useTranslation()
  const [newComment, setNewComment] = useState('')
  const [isVisible, setIsVisible] = useState(true)

  const { data, isLoading } = useParticipantComments(participantId)
  const addComment = useAddParticipantComment(participantId)

  const comments = data?.comments || []

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    addComment.mutate(
      {
        comment: newComment,
        isVisibleToParticipant: isVisible,
      },
      {
        onSuccess: () => {
          toast.success(t('participant.comments.success'))
          setNewComment('')
          setIsVisible(true)
        },
        onError: (error) => {
          toast.error(error.message || t('participant.comments.error'))
        },
      },
    )
  }

  if (isLoading) {
    return (
      <Card className="rounded-lg p-6 mt-4">
        <h3 className="text-xl font-semibold mb-4">
          {t('participant.comments.title')}
        </h3>

        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />

        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-lg p-6 mt-4">
      <h3 className="text-xl font-semibold mb-4">
        {t('participant.comments.title')}
      </h3>

      {/* Add Comment Form */}
      <div className="space-y-3 mb-6">
        <Textarea
          placeholder={t('participant.comments.placeholder')}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-25"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="visible-switch"
              checked={isVisible}
              onCheckedChange={setIsVisible}
            />
            <Label htmlFor="visible-switch" className="text-sm">
              {t('participant.comments.visibleToParticipant')}
            </Label>
          </div>

          <Button
            onClick={handleAddComment}
            disabled={addComment.isPending || !newComment.trim()}
          >
            {addComment.isPending
              ? t('participant.comments.sending')
              : t('participant.comments.sendMessage')}
          </Button>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">
            {t('participant.comments.noMessages')}
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`border rounded-lg p-4 ${comment.authorType === 'participant'
                ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
                : 'border-gray-200 dark:border-gray-700'
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold text-sm">
                    {comment.authorName}
                    {comment.authorType === 'participant' && (
                      <span className="ml-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                        {t('participant.comments.participant')}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                {comment.authorType === 'host' &&
                  !comment.isVisibleToParticipant && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded">
                      {t('participant.comments.private')}
                    </span>
                  )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
