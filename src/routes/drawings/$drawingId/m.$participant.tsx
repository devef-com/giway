import { Participant } from '@/db/schema'
import {
  createFileRoute,
  useNavigate,
} from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ParticipantStatus } from '@/lib/participants'

// type ParticipantStatus = 'pending' | 'approved' | 'rejected'

export const Route = createFileRoute('/drawings/$drawingId/m/$participant')({
  component: RouteComponent,
})

function RouteComponent() {
  const { participant: participantId, drawingId } = Route.useParams()
  const navigate = useNavigate()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<ParticipantStatus>('pending')
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
    participant.isEligible === true ? 'approved' :
      participant.isEligible === false ? 'rejected' : 'pending'

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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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
                className={`inline-block px-2 py-1 rounded text-sm ${currentStatus === 'approved'
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
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-4">
          <h3 className="text-xl font-semibold mb-4">
            Change Participant Status
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select New Status
              </label>
              <Select
                value={selectedStatus}
                onValueChange={(value) =>
                  setSelectedStatus(value as ParticipantStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
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
