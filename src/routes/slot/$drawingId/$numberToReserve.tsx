import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, CircleAlert, Clock } from 'lucide-react'
import type { Participant } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useDrawing } from '@/querys/useDrawing'
import { useReservationTime } from '@/querys/useReservationTime'
import { useParticipate } from '@/querys/useParticipate'

export const Route = createFileRoute('/slot/$drawingId/$numberToReserve')({
  component: ReserveNumberForm,
})

function ReserveNumberForm() {
  const { drawingId, numberToReserve } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [reservationComplete, setReservationComplete] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [reservationTimestamp, setReservationTimestamp] = useState<
    number | null
  >(null)
  const [isTitleExpanded, setIsTitleExpanded] = useState(false)

  // Parse selected numbers from the route parameter
  const selectedNumbers = numberToReserve.split(',').map((n) => parseInt(n, 10))

  // Create a unique key for this reservation in localStorage
  // Use sorted copy to match the key created on the previous page
  const sortedNumbers = [...selectedNumbers].sort((a, b) => a - b)
  const reservationKey = `reservation_${drawingId}_${sortedNumbers.join('_')}`

  // Fetch drawing details
  const { data: drawing, isLoading: drawingLoading } = useDrawing(drawingId)

  const { data: reservationTimeData } = useReservationTime()

  // Reserve numbers on mount (only if not already reserved from previous page)
  useEffect(() => {
    const checkAndMarkReservation = () => {
      if (reservationComplete || !drawing) return

      // Check if we already have a valid reservation in localStorage
      const storedReservation = localStorage.getItem(reservationKey)
      if (storedReservation) {
        try {
          const { timestamp, numbers } = JSON.parse(storedReservation)
          const now = Date.now()
          const reservationTime =
            (reservationTimeData?.reservationTimeMinutes || 4) * 60 * 1000

          // Check if reservation is still valid (within 4 minutes)
          if (
            now - timestamp < reservationTime &&
            JSON.stringify(numbers.sort()) ===
              JSON.stringify(selectedNumbers.sort())
          ) {
            // Reservation is still valid, mark as complete
            setReservationComplete(true)
            return
          } else {
            // Reservation expired, redirect back
            // TODO call to release numbers endpoint
            handleCancel()
            toast.error('Reservation expired. Please select numbers again.')
            navigate({ to: '/slot/$drawingId', params: { drawingId } })
          }
        } catch (e) {
          // Invalid data, redirect back
          handleCancel()
          toast.error('Invalid reservation. Please select numbers again.')
          navigate({ to: '/slot/$drawingId', params: { drawingId } })
        }
      } else {
        // No reservation found, redirect back
        toast.error('No reservation found. Please select numbers again.')
        navigate({ to: '/slot/$drawingId', params: { drawingId } })
      }
    }

    checkAndMarkReservation()
  }, [
    drawingId,
    drawing,
    reservationComplete,
    reservationKey,
    selectedNumbers,
    reservationTimeData,
    navigate,
  ])

  // Countdown timer effect
  useEffect(() => {
    if (!reservationComplete || !reservationTimeData || !reservationTimestamp)
      return

    const reservationTime =
      reservationTimeData.reservationTimeMinutes * 60 * 1000

    const updateTimer = () => {
      const now = Date.now()
      const elapsed = now - reservationTimestamp
      const remaining = Math.max(0, reservationTime - elapsed)

      setTimeRemaining(remaining)

      if (remaining <= 0) {
        // Time expired
        clearInterval(interval)

        fetch(`/api/drawings/${drawingId}/reserve`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({ numbers: selectedNumbers }),
        })

        // queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
        toast.error('Reservation expired. Click "Reserve again" to continue.')
      }
    }

    // Update immediately
    updateTimer()

    // Update every second
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [reservationComplete, reservationTimeData, reservationTimestamp])

  // Load timestamp from localStorage when reservation is complete
  useEffect(() => {
    if (!reservationComplete) return

    const storedReservation = localStorage.getItem(reservationKey)
    if (!storedReservation) return

    try {
      const { timestamp } = JSON.parse(storedReservation)
      setReservationTimestamp(timestamp)
    } catch (e) {
      console.error('Error parsing reservation data:', e)
    }
  }, [reservationComplete, reservationKey])

  // Release reservations when navigating away from the page (including back button)
  const cleanupRef = useRef({
    reservationComplete,
    selectedNumbers,
    reservationKey,
    drawingId,
  })

  // Update ref when values change
  useEffect(() => {
    cleanupRef.current = {
      reservationComplete,
      selectedNumbers,
      reservationKey,
      drawingId,
    }
  }, [reservationComplete, selectedNumbers, reservationKey, drawingId])

  // Cleanup effect that only runs on unmount
  useEffect(() => {
    return () => {
      // Cleanup: release reservations if user navigates away without completing registration
      // This will fire when user clicks back, goes to another route, etc.
      const {
        reservationComplete: isComplete,
        selectedNumbers: numbers,
        reservationKey: key,
        drawingId: id,
      } = cleanupRef.current

      if (isComplete && numbers.length > 0) {
        console.log('Releasing reservations due to navigation away from page')
        localStorage.removeItem(key)
        // Use fetch with keepalive for reliable cleanup during navigation
        fetch(`/api/drawings/${id}/reserve`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numbers }),
          keepalive: true, // Allows request to complete even during navigation
        }).catch((err) => console.error('Error releasing reservations:', err))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only runs on mount/unmount

  // Submit registration mutation
  const participateMutation = useParticipate(
    drawingId,
    (data: Participant) => {
      // Clean up localStorage on successful registration
      localStorage.removeItem(reservationKey)

      queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
      queryClient.invalidateQueries({ queryKey: ['drawing-stats', drawingId] })
      navigate({ to: `/drawings/${drawingId}/p/${data.id}`, replace: true })
    },
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const registrationData = {
      ...formData,
      selectedNumbers,
    }

    participateMutation.mutate(registrationData)
  }

  const handleCancel = async () => {
    // Clean up localStorage
    localStorage.removeItem(reservationKey)

    if (selectedNumbers.length > 0) {
      try {
        await fetch(`/api/drawings/${drawingId}/reserve`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({ numbers: selectedNumbers }),
        })

        queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
      } catch (error) {
        console.error('Error releasing reservations:', error)
      }
    }

    navigate({ to: '/slot/$drawingId', params: { drawingId } })
  }

  const reserveAgain = async () => {
    try {
      const reservationPromises = selectedNumbers.map((number) =>
        fetch(`/api/drawings/${drawingId}/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number,
            expirationMinutes: reservationTimeData?.reservationTimeMinutes || 4,
          }),
        }),
      )

      const responses = await Promise.all(reservationPromises)
      const allSuccessful = responses.every((r) => r.ok)

      if (allSuccessful) {
        // Store reservation in localStorage with timestamp
        // Create a copy for sorting to avoid mutation
        const sortedNumbers = [...selectedNumbers].sort((a, b) => a - b)
        const reservationKey = `reservation_${drawingId}_${sortedNumbers.join('_')}`
        const reservationData = JSON.stringify({
          timestamp: Date.now(),
          numbers: selectedNumbers,
          drawingId,
        })

        localStorage.setItem(reservationKey, reservationData)

        // Reset the timer by updating the timestamp
        setReservationTimestamp(Date.now())

        toast.success('Numbers reserved successfully!')
      } else {
        toast.error(
          'Some numbers could not be reserved. They may have been taken.',
        )
      }
    } catch (error) {
      console.error('Error reserving numbers again:', error)
      toast.error('Error reserving numbers again')
    }
  }

  if (drawingLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              <p className="ml-4">Loading...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!drawing) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <p className="text-center text-xl">Drawing not found</p>
            <div className="text-center mt-4">
              <Button
                onClick={() => navigate({ to: '/' })}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Go Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-display">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            Confirm Your Registration
          </h1>
          <div>
            <p
              className={cn(
                'text-text-light-secondary dark:text-text-dark-secondary',
                !isTitleExpanded && drawing.title.length > 158
                  ? 'line-clamp-2'
                  : '',
              )}
            >
              {drawing.title}
            </p>
            {drawing.title.length > 158 && (
              <button
                onClick={() => setIsTitleExpanded(!isTitleExpanded)}
                className="text-cyan-600 dark:text-cyan-400 text-sm hover:underline mt-1"
              >
                {isTitleExpanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        </div>

        {/* Selected Numbers Info */}
        <Card className="p-4 mb-6 border border-gray-300 dark:border-gray-600">
          <h2 className="text-center text-xl font-semibold text-gray-700 dark:text-gray-300 mb-0">
            Selected Numbers
          </h2>
          <div className="flex justify-center gap-3 flex-wrap">
            {selectedNumbers.map((num) => (
              <div
                key={num}
                className="w-16 h-16 flex items-center justify-center bg-cyan-100 dark:bg-cyan-900/40 border-2 border-cyan-400 dark:border-cyan-600 rounded-lg shadow-[2px_-1px_0px_rgba(34,211,238,0.9),0px_3px_0px_rgba(41,20,198,0.25)]"
              >
                <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {num}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Countdown Timer */}
        {timeRemaining !== null && (
          <Card className="p-4 mb-6 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div>
                  <Clock className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Time Remaining
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Complete your registration before time runs out. If the
                    timer reaches zero, your reserved numbers will be released.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                  {Math.floor(timeRemaining / 60000)}:
                  {String(Math.floor((timeRemaining % 60000) / 1000)).padStart(
                    2,
                    '0',
                  )}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  minutes
                </p>
              </div>
            </div>
            {timeRemaining === 0 && (
              <Button className="max-w-max self-end" onClick={reserveAgain}>
                Reserve again
              </Button>
            )}
          </Card>
        )}

        {/* Registration Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="name"
                className="text-text-light-primary dark:text-text-dark-primary mb-1"
              >
                Full Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Enter your full name"
                className="bg-white dark:bg-slate-700 text-text-light-primary dark:text-text-dark-primary border-gray-300 dark:border-slate-600 focus:border-cyan-500"
              />
            </div>

            <div>
              <Label
                htmlFor="email"
                className="text-text-light-primary dark:text-text-dark-primary mb-1"
              >
                Email (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="your@email.com"
                className="bg-white dark:bg-slate-700 text-text-light-primary dark:text-text-dark-primary border-gray-300 dark:border-slate-600 focus:border-cyan-500"
              />
            </div>

            <div>
              <Label
                htmlFor="phone"
                className="text-text-light-primary dark:text-text-dark-primary mb-1"
              >
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                placeholder="+1 (555) 000-0000"
                className="bg-white dark:bg-slate-700 text-text-light-primary dark:text-text-dark-primary border-gray-300 dark:border-slate-600 focus:border-cyan-500"
              />
            </div>

            {drawing.isPaid && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-start gap-3">
                  <CircleAlert className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                      Payment Required
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-100 text-sm mt-1">
                      This is a paid event. Attach your payment proof to confirm
                      your participation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={participateMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={participateMutation.isPending || timeRemaining === 0}
                className="bg-cyan-600 hover:bg-cyan-700 text-white flex-1"
              >
                {participateMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Registering...
                  </span>
                ) : (
                  'Register Now'
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Reservation Timer Info */}
        <Card className="p-4 mt-6 bg-gray-50 dark:bg-gray-900/30">
          <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
            <svg
              className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">
                Important:
              </p>
              <ul className="space-y-1">
                <li>
                  • Your number{selectedNumbers.length > 1 ? 's are' : ' is'}{' '}
                  reserved for{' '}
                  {reservationTimeData?.reservationTimeMinutes || 4} minutes
                </li>
                <li>• Complete the form before time expires</li>
                <li>
                  • If you leave this page, your reservation will be released
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
