/**
 * Improved Drawing Participation Page with Number Slots System
 * 
 * This route uses a paginated number grid with horizontal scrolling,
 * efficient slot management, and real-time status updates.
 * 
 * Features:
 * - Paginated grid layout (6 columns × 14 rows = 84 numbers per page)
 * - Horizontal pagination with dots indicator
 * - Floating arrow button when numbers are selected
 * - Bulk number selection for paid giveaways
 * - Single number selection for free giveaways
 * - Real-time slot status updates (available, reserved, taken)
 * - Temporary reservations with expiration
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { DrawingStats } from '@/lib/number-slots'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/slot/$drawingId')({
  component: SlotDrawingParticipation,
})

interface Drawing {
  id: string
  title: string
  guidelines: Array<string> | null
  isPaid: boolean
  price: number
  winnerSelection: 'random' | 'number'
  quantityOfNumbers: number
  endAt: string
  createdAt: string
}

interface NumberSlotsData {
  slots: Array<{
    number: number
    status: 'available' | 'reserved' | 'taken'
    participantName?: string
    expiresAt?: string
  }>
}

function SlotDrawingParticipation() {
  const { drawingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedNumbers, setSelectedNumbers] = useState<Array<number>>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [isReserving, setIsReserving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const formSectionRef = useRef<HTMLDivElement>(null)

  const NUMBERS_PER_PAGE = 6 * 14 // 6 columns × 14 rows = 84 numbers per page

  // Fetch drawing details
  const { data: drawing, isLoading: drawingLoading } = useQuery<Drawing>({
    queryKey: ['public-drawing', drawingId],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/${drawingId}`)
      if (!response.ok) throw new Error('Failed to fetch drawing')
      return response.json()
    },
  })

  // Fetch drawing statistics
  const { data: stats } = useQuery<DrawingStats>({
    queryKey: ['drawing-stats', drawingId],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/${drawingId}/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
    enabled: !!drawing && drawing.winnerSelection === 'number',
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  // Calculate total pages
  const totalPages = drawing ? Math.ceil(drawing.quantityOfNumbers / NUMBERS_PER_PAGE) : 0

  // Fetch slots for all pages
  const { data: slotsData } = useQuery<NumberSlotsData>({
    queryKey: ['number-slots', drawingId],
    queryFn: async () => {
      if (!drawing) return { slots: [] }
      const numbers = Array.from(
        { length: drawing.quantityOfNumbers },
        (_, i) => i + 1
      )
      const response = await fetch(
        `/api/drawings/${drawingId}/slots?numbers=${numbers.join(',')}`
      )
      if (!response.ok) throw new Error('Failed to fetch slots')
      return response.json()
    },
    enabled: !!drawing && drawing.winnerSelection === 'number',
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  // Handle scroll to update active page
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const scrollLeft = scrollContainer.scrollLeft
      const pageWidth = scrollContainer.offsetWidth
      const page = Math.round(scrollLeft / pageWidth)
      if (page !== currentPage) {
        setCurrentPage(page)
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [currentPage])

  // Handle number selection with reservation
  const handleNumberSelect = (number: number) => {
    if (isReserving) return

    // Check if drawing is paid (allow multiple) or free (allow single)
    if (!drawing?.isPaid) {
      // Free giveaway: only allow single selection
      if (selectedNumbers.includes(number)) {
        setSelectedNumbers([])
        return
      }
      setSelectedNumbers([number])
    } else {
      // Paid giveaway: allow multiple selections
      if (selectedNumbers.includes(number)) {
        setSelectedNumbers(selectedNumbers.filter(n => n !== number))
        return
      }
      setSelectedNumbers([...selectedNumbers, number])
    }
  }

  // Reserve selected numbers when user clicks the arrow
  const handleReserveNumbers = async () => {
    if (isReserving || selectedNumbers.length === 0) return

    setIsReserving(true)
    try {
      // Reserve all selected numbers
      const reservationPromises = selectedNumbers.map(number =>
        fetch(`/api/drawings/${drawingId}/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number, expirationMinutes: 15 }),
        })
      )

      const responses = await Promise.all(reservationPromises)
      const allSuccessful = responses.every(r => r.ok)

      if (allSuccessful) {
        // Scroll to form section
        formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
        
        // Invalidate slots cache to show updated status
        queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
      } else {
        alert('Some numbers could not be reserved. Please try again.')
        setSelectedNumbers([])
      }
    } catch (error) {
      console.error('Error reserving numbers:', error)
      alert('An error occurred while reserving numbers')
      setSelectedNumbers([])
    } finally {
      setIsReserving(false)
    }
  }

  // Submit registration mutation
  const participateMutation = useMutation({
    mutationFn: async (data: typeof formData & { selectedNumbers?: Array<number> }) => {
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
    onSuccess: () => {
      alert('Successfully registered for the drawing!')
      queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
      queryClient.invalidateQueries({ queryKey: ['drawing-stats', drawingId] })
      navigate({ to: '/' })
    },
    onError: (error: Error) => {
      alert(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const registrationData = {
      ...formData,
      selectedNumbers: drawing?.winnerSelection === 'number' ? selectedNumbers : undefined,
    }

    participateMutation.mutate(registrationData)
  }

  // Loading state
  if (drawingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              <p className="text-white ml-4">Loading drawing...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Drawing not found
  if (!drawing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center text-xl">Drawing not found</p>
            <div className="text-center mt-4">
              <Button onClick={() => navigate({ to: '/' })} className="bg-cyan-600 hover:bg-cyan-700">
                Go Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-background-light dark:bg-background-dark font-display min-h-screen">
      <div className="flex w-full flex-col p-4 sm:max-w-md sm:mx-auto">
        {/* Drawing Details Card */}
        <Card className="p-6 bg-slate-800/50 border-slate-700 mb-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">{drawing.title}</h1>

              <div className="grid grid-cols-1 gap-2 text-white text-sm">
                <p className="text-gray-400">
                  <strong className="text-white">Type:</strong>{' '}
                  {drawing.isPaid ? (
                    <span className="text-yellow-400">Paid - ${(drawing.price / 100).toFixed(2)}</span>
                  ) : (
                    <span className="text-green-400">Free</span>
                  )}
                </p>
                <p className="text-gray-400">
                  <strong className="text-white">End Date:</strong>{' '}
                  {new Date(drawing.endAt).toLocaleString()}
                </p>
                {drawing.winnerSelection === 'number' && stats && (
                  <p className="text-gray-400">
                    <strong className="text-white">Availability:</strong>{' '}
                    <span className="text-cyan-400">
                      {stats.available} / {stats.total} available
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Number Selection Grid (only for number-based drawings) */}
        {drawing.winnerSelection === 'number' && (
          <>
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto overflow-y-auto snap-x snap-mandatory flex-1 mb-20"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div className="flex h-full" style={{ minHeight: '500px' }}>
                {/* Generate pages */}
                {Array.from({ length: totalPages }, (_, pageIndex) => {
                  const startIdx = pageIndex * NUMBERS_PER_PAGE
                  const endIdx = Math.min(startIdx + NUMBERS_PER_PAGE, drawing.quantityOfNumbers)
                  const pageNumbers = Array.from(
                    { length: endIdx - startIdx },
                    (_unused, i) => startIdx + i + 1
                  )

                  return (
                    <div
                      key={pageIndex}
                      className="flex-shrink-0 w-full snap-start overflow-y-auto"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                      }}
                    >
                      <div className="grid grid-cols-6 gap-2 pb-4">
                        {pageNumbers.map((number) => {
                          const slot = slotsData?.slots.find(s => s.number === number)
                          const isSelected = selectedNumbers.includes(number)
                          const isAvailable = !slot || slot.status === 'available'
                          const isTaken = slot?.status === 'taken'
                          const isReserved = slot?.status === 'reserved'

                          return (
                            <button
                              key={number}
                              onClick={() => isAvailable && handleNumberSelect(number)}
                              disabled={!isAvailable}
                              className={`
                                aspect-square w-full px-0 py-0 rounded-lg flex items-center justify-center 
                                text-lg font-[200] transition-colors duration-200 cursor-pointer
                                border ${
                                  isSelected
                                    ? 'bg-[#14b8a6] border-[#14b8a6] text-white'
                                    : isTaken
                                    ? 'bg-red-500/20 border-red-500/50 text-red-300 cursor-not-allowed'
                                    : isReserved
                                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 cursor-not-allowed'
                                    : 'border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary bg-background-light dark:bg-background-dark hover:bg-[#14b8a6]/10'
                                }
                              `}
                              style={{
                                boxShadow: '0px 2px 0px 0px rgba(216,216,216,0.25)',
                              }}
                            >
                              {number}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Floating Footer with Arrow and Dots */}
            {selectedNumbers.length > 0 && (
              <div 
                className="fixed bottom-0 left-1/2 -translate-x-1/2 mb-2 p-2 rounded-lg"
                style={{
                  background: 'linear-gradient(to top, rgb(250 250 250) 0%, rgb(250 250 250 / 0.8) 50%, transparent 100%)',
                }}
              >
                <div 
                  className="w-[47px] h-[47px] grid justify-center items-center mx-auto bg-[#14b8a6] rounded-full cursor-pointer hover:bg-[#0d9488] transition-colors"
                  onClick={handleReserveNumbers}
                >
                  <svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.4235 9.34772L25.1786 15.1057L19.4235 20.8622" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6.47449 15.1071H25.1786" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex justify-center items-center mt-3 z-10">
                  <div className="flex items-center space-x-2 rounded-full p-1.5 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <div
                        key={i}
                        className={`rounded-full transition-all duration-200 ${
                          i === currentPage
                            ? 'w-3 h-3 bg-[#14b8a6]'
                            : 'w-2.5 h-2.5 bg-border-light dark:bg-border-dark'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {selectedNumbers.length > 0 && (
                  <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Selected: {selectedNumbers.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Pagination dots only (when no numbers selected) */}
            {selectedNumbers.length === 0 && totalPages > 1 && (
              <div className="fixed bottom-0 left-1/2 -translate-x-1/2 mb-4">
                <div className="flex items-center space-x-2 rounded-full p-1.5 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-200 ${
                        i === currentPage
                          ? 'w-3 h-3 bg-[#14b8a6]'
                          : 'w-2.5 h-2.5 bg-border-light dark:bg-border-dark'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Registration Form */}
        <div ref={formSectionRef}>
          <Card className="p-6 bg-slate-800/50 border-slate-700 mt-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              {drawing.winnerSelection === 'number' ? 'Confirm Your Registration' : 'Register for Drawing'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter your full name"
                  className="bg-slate-700 text-white border-slate-600 focus:border-cyan-500"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white">
                  Email (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="bg-slate-700 text-white border-slate-600 focus:border-cyan-500"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white">
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="+1 (555) 000-0000"
                  className="bg-slate-700 text-white border-slate-600 focus:border-cyan-500"
                />
              </div>

              {drawing.isPaid && (
                <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-700">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-yellow-200 font-medium">Payment Required</p>
                      <p className="text-yellow-100 text-sm mt-1">
                        This is a paid event. After registration, you will need to complete the payment
                        and upload proof. Your number will be reserved during this process.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: '/' })}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    participateMutation.isPending ||
                    (drawing.winnerSelection === 'number' && selectedNumbers.length === 0)
                  }
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {participateMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Registering...
                    </span>
                  ) : (
                    'Complete Registration'
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Help/Info Section */}
          <Card className="p-4 bg-slate-800/30 border-slate-700 mt-4">
            <div className="flex items-start gap-3 text-sm text-gray-400">
              <svg
                className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5"
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
                <p className="text-white font-medium mb-1">How it works:</p>
                <ul className="space-y-1">
                  {drawing.winnerSelection === 'number' ? (
                    <>
                      <li>• Select {drawing.isPaid ? 'one or more numbers' : 'a number'} from the grid</li>
                      <li>• Click the arrow button to proceed</li>
                      <li>• Your {drawing.isPaid ? 'numbers' : 'number'} will be reserved for 15 minutes</li>
                      <li>• Complete the registration form with your details</li>
                      {drawing.isPaid && <li>• Upload payment proof to confirm your participation</li>}
                      <li>• Wait for the drawing date to see if you win!</li>
                    </>
                  ) : (
                    <>
                      <li>• Fill out the registration form with your details</li>
                      {drawing.isPaid && <li>• Upload payment proof to confirm your participation</li>}
                      <li>• The winner will be selected randomly on the drawing date</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        #scrollContainer::-webkit-scrollbar,
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
