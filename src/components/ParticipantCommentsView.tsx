import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function ParticipantCommentsView({
  drawingId,
  participantId,
}: {
  drawingId: string
  participantId: string
}) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchComments()
  }, [drawingId, participantId])

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `/api/drawings/${drawingId}/p/${participantId}/comments`,
      )
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(
        `/api/drawings/${drawingId}/p/${participantId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: newComment }),
        },
      )

      if (response.ok) {
        toast.success('Message sent successfully')
        setNewComment('')
        await fetchComments()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to send message')
      }
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-4 mt-4">
        <h2 className="text-lg font-semibold mb-3">Conversation with Host</h2>
        <p className="text-sm text-gray-500">Loading conversation...</p>
      </Card>
    )
  }

  // Only show if there are comments or user has interacted
  if (comments.length === 0 && !newComment) {
    return null
  }

  return (
    <Card className="p-4 mt-4">
      <h2 className="text-lg font-semibold mb-3">Conversation with Host</h2>

      {/* Conversation Thread */}
      <div className="space-y-3 mb-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">No messages yet</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-lg p-3 ${
                comment.authorType === 'host'
                  ? 'bg-gray-50 dark:bg-gray-800'
                  : 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">
                  {comment.authorType === 'host'
                    ? `${comment.authorName} (Host)`
                    : 'You'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
            </div>
          ))
        )}
      </div>

      {/* Reply Form */}
      <div className="space-y-2 border-t pt-4">
        <Textarea
          placeholder="Write your message..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
        />
        <Button
          onClick={handleAddComment}
          disabled={isSubmitting || !newComment.trim()}
          className="w-full"
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </Card>
  )
}
