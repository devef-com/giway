import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function ParticipantComments({ participantId }: { participantId: number }) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchComments()
  }, [participantId])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/participant/${participantId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      } else if (response.status !== 401 && response.status !== 403) {
        toast.error('Failed to load comments')
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
      const response = await fetch(`/api/participant/${participantId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: newComment,
          isVisibleToParticipant: isVisible,
        }),
      })

      if (response.ok) {
        toast.success('Comment added successfully')
        setNewComment('')
        setIsVisible(true)
        await fetchComments()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to add comment')
      }
    } catch (error) {
      toast.error('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="rounded-lg p-6 mt-4">
        <h3 className="text-xl font-semibold mb-4">Conversation</h3>
        <p className="text-sm text-gray-500">Loading conversation...</p>
      </Card>
    )
  }

  return (
    <Card className="rounded-lg p-6 mt-4">
      <h3 className="text-xl font-semibold mb-4">Conversation</h3>
      
      {/* Add Comment Form */}
      <div className="space-y-3 mb-6">
        <Textarea
          placeholder="Add a message..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[100px]"
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="visible-switch"
              checked={isVisible}
              onCheckedChange={setIsVisible}
            />
            <Label htmlFor="visible-switch" className="text-sm">
              Visible to participant
            </Label>
          </div>
          
          <Button
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`border rounded-lg p-4 ${
                comment.authorType === 'participant'
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
                        Participant
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                {comment.authorType === 'host' && !comment.isVisibleToParticipant && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded">
                    Private
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
