import { Participant } from '@/db/schema'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { ParticipantStatus } from '@/lib/participants'
import { Card } from '@/components/ui/card'

// type ParticipantStatus = 'pending' | 'approved' | 'rejected'

export const Route = createFileRoute('/drawings/$drawingId/m/$participant')({
  component: RouteComponent,
})

function RouteComponent() {
  const { participant: participantId, drawingId } = Route.useParams()
  const navigate = useNavigate()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [selectedStatus, setSelectedStatus] =
    useState<ParticipantStatus>('pending')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchParticipant = async () => {
      // Try to get participant from navigation state first
      const state = window.history.state
      if (state && state.name) {
        setParticipant(state as Participant)
        setIsLoading(false)
        return
      }

      // If no state, fetch from API
      try {
        const response = await fetch(`/api/participant/${participantId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch participant')
        }
        const data = await response.json()
        setParticipant(data)
      } catch (error) {
        toast.error('Failed to load participant data')
        navigate({
          to: '/drawings/$drawingId',
          params: { drawingId },
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchParticipant()
  }, [participantId, drawingId, navigate])

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading participant...</div>
  }

  if (!participant) {
    return <div className="container mx-auto p-4">Participant not found</div>
  }

  const currentStatus: ParticipantStatus =
    participant.isEligible === true
      ? 'approved'
      : participant.isEligible === false
        ? 'rejected'
        : 'pending'

  const handleStatusChange = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/participant/${participantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: selectedStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update participant status')
      }

      toast.success(data.message || 'Participant status updated successfully')

      navigate({
        to: '/drawings/$drawingId',
        params: { drawingId },
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update participant status',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Participant Information</h2>
          <div className="space-y-3">
            <div>
              <span className="font-semibold">Name:</span> {participant.name}
            </div>
            <div>
              <span className="font-semibold">Phone:</span> {participant.phone}
            </div>
            {participant.email && (
              <div>
                <span className="font-semibold">Email:</span>{' '}
                {participant.email}
              </div>
            )}
            <div>
              <span className="font-semibold">Current Status:</span>{' '}
              <span
                className={`inline-block px-2 py-1 rounded text-sm ${
                  currentStatus === 'approved'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    : currentStatus === 'rejected'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                }`}
              >
                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              </span>
            </div>
          </div>
        </Card>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-4">
          <h3 className="text-xl font-semibold mb-4">
            Change Participant Status
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select New Status
              </label>
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden w-full">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('pending')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    selectedStatus === 'pending'
                      ? 'bg-neutral-200 text-gray-900 dark:bg-gray-700 dark:text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('rejected')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-x border-gray-300 dark:border-gray-600 ${
                    selectedStatus === 'rejected'
                      ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-red-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-red-900/20'
                  }`}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('approved')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    selectedStatus === 'approved'
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-green-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-green-900/20'
                  }`}
                >
                  Approved
                </button>
              </div>
            </div>
            <Button
              onClick={handleStatusChange}
              disabled={isSubmitting || selectedStatus === currentStatus}
              className="w-full"
            >
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
            Debug Info
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
            {JSON.stringify({ participantId, participant }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
