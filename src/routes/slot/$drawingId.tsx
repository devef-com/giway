import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Image } from 'lucide-react'
import type { DrawingStats } from '@/lib/number-slots'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  // DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import DrawingSlotHeader from '@/components/DrawingSlotHeader'

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

interface FormProps {
  formData: {
    name: string
    email: string
    phone: string
  }
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string
    email: string
    phone: string
  }>>
  drawing: Drawing
}

const Form: React.FC<FormProps> = ({ formData, setFormData, drawing }) => {
  return (
    <>
      <div>
        <Label htmlFor="name" className="text-black dark:text-white mb-1">
          Full Name *
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Enter your full name"
          className="bg-white dark:bg-slate-700 text-black dark:text-white border-gray-300 dark:border-slate-600 focus:border-cyan-500"
        />
      </div>

      <div>
        <Label htmlFor="email" className="text-black dark:text-white mb-1">
          Email (Optional)
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="your@email.com"
          className="bg-white dark:bg-slate-700 text-black dark:text-white border-gray-300 dark:border-slate-600 focus:border-cyan-500"
        />
      </div>

      <div>
        <Label htmlFor="phone" className="text-black dark:text-white mb-1">
          Phone Number *
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          placeholder="+1 (555) 000-0000"
          className="bg-white dark:bg-slate-700 text-black dark:text-white border-gray-300 dark:border-slate-600 focus:border-cyan-500"
        />
      </div>

      {drawing.isPaid && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5"
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
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">Payment Required</p>
              <p className="text-yellow-700 dark:text-yellow-100 text-sm mt-1">
                This is a paid event. Attach your payment proof to confirm your participation.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SlotDrawingParticipation() {
  const { drawingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedNumbers, setSelectedNumbers] = useState<Array<number>>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [isReserving, setIsReserving] = useState(false)
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const floatingControlsRef = useRef<HTMLDivElement>(null)

  const NUMBERS_PER_PAGE = 6 * 17 // 6 columns × 17 rows = 102 numbers per page

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

  // Fetch slots for current page and adjacent pages (batched loading for optimization)
  const { data: slotsData } = useQuery<NumberSlotsData>({
    queryKey: ['number-slots', drawingId, currentPage],
    queryFn: async () => {
      if (!drawing) return { slots: [] }

      // Fetch current page + 1 page before and after for smooth scrolling
      const pagesToFetch = [
        Math.max(0, currentPage - 1),
        currentPage,
        Math.min(totalPages - 1, currentPage + 1),
      ].filter((page, index, array) => array.indexOf(page) === index) // Remove duplicates

      const numbersToFetch: number[] = []
      pagesToFetch.forEach(page => {
        const startIdx = page * NUMBERS_PER_PAGE
        const endIdx = Math.min(startIdx + NUMBERS_PER_PAGE, drawing.quantityOfNumbers)
        for (let i = startIdx; i < endIdx; i++) {
          numbersToFetch.push(i + 1)
        }
      })

      const response = await fetch(
        `/api/drawings/${drawingId}/slots?numbers=${numbersToFetch.join(',')}`
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
  }, [currentPage, scrollContainerRef.current])

  // Position floating controls to stay within scroll container bounds
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    const floatingControls = floatingControlsRef.current
    if (!scrollContainer || !floatingControls) return

    const updatePosition = () => {
      const rect = scrollContainer.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const containerBottom = rect.bottom

      // Only update position when container bottom is about to leave viewport
      // Keep it fixed at bottom while container is still visible in viewport
      if (containerBottom < viewportHeight - 50) {
        // Container bottom is getting close to leaving viewport, stick to container
        floatingControls.style.position = 'fixed'
        floatingControls.style.bottom = `${viewportHeight - containerBottom + 8}px`
        floatingControls.style.left = '50%'
        floatingControls.style.transform = 'translateX(-50%)'
      } else {
        // Container is fully visible, keep controls at bottom of viewport
        floatingControls.style.position = 'fixed'
        floatingControls.style.bottom = '8px'
        floatingControls.style.left = '50%'
        floatingControls.style.transform = 'translateX(-50%)'
      }
    }

    // Initial position
    updatePosition()

    // Only update on window scroll (not container scroll to avoid bounce)
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [scrollContainerRef.current, floatingControlsRef.current])

  // Navigate to a specific page
  const goToPage = (pageIndex: number) => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const pageWidth = scrollContainer.offsetWidth
    scrollContainer.scrollTo({
      left: pageIndex * pageWidth,
      behavior: 'smooth',
    })
  }

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

    setIsReserving(true);
    try {
      // Reserve all selected numbers
      const reservationPromises = selectedNumbers.map(number =>
        fetch(`/api/drawings/${drawingId}/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number, expirationMinutes: 4 }),
        })
      )

      const responses = await Promise.all(reservationPromises)
      const allSuccessful = responses.every(r => r.ok)

      if (allSuccessful) {
        // Show form modal
        setShowForm(true)

        // Invalidate slots cache to show updated status
        queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
      } else {
        toast.error('Some numbers could not be reserved. Please try again.')
        setSelectedNumbers([])
      }
    } catch (error) {
      console.error('Error reserving numbers:', error)
      toast.error('An error occurred while reserving numbers')
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
      toast.success('Successfully registered for the drawing!')
      queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
      queryClient.invalidateQueries({ queryKey: ['drawing-stats', drawingId] })
      navigate({ to: '/' })
    },
    onError: (error: Error) => {
      toast.error(error.message)
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

  // Handle cancel and release reservations
  const handleCancelReservation = async () => {
    if (selectedNumbers.length > 0) {
      try {
        await fetch(`/api/drawings/${drawingId}/reserve`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numbers: selectedNumbers }),
        })

        // Invalidate slots cache to show updated status
        queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
      } catch (error) {
        console.error('Error releasing reservations:', error)
      }
    }

    // Clear selected numbers and close drawer
    setSelectedNumbers([])
    setShowForm(false)
  }

  // Loading state
  if (drawingLoading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
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
      <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
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
      <div className="flex w-full flex-col p-4 sm:max-w-[600px] sm:mx-auto">
        {/* Drawing Details Card */}
        <DrawingSlotHeader drawing={drawing} stats={stats} />
        <div className="grid grid-cols-[max-content_1fr] items-center gap-4 mb-4">
          <Image size={120} strokeWidth={.7} />
          {drawing.guidelines && drawing.guidelines.length > 0 && (
            <div>
              <h2 className="font-regular mb-2 text-text-light-primary dark:text-text-dark-primary">
                Guidelines
              </h2>
              <ul className="list-disc list-inside space-y-1 text-text-light-secondary dark:text-text-dark-secondary">
                {drawing.guidelines.map((guideline, index) => (
                  <li key={index}>{guideline}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Number Selection Grid (only for number-based drawings) */}
        {drawing.winnerSelection === 'number' && (
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex-1"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div className="flex" style={{ minHeight: '500px' }}>
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
                      className="shrink-0 w-full snap-start overflow-y-auto"
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
                                text-xl font-normal transition-colors duration-200 cursor-pointer
                                border ${isSelected
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
              {(selectedNumbers.length > 0 || totalPages > 1) && (
                <div className="h-[100px]"></div>
              )}
            </div>

            {/* Floating Footer with Arrow and Dots - Positioned dynamically */}
            <div
              ref={floatingControlsRef}
              className={cn("p-2 rounded-lg z-10 bg-linear-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 backdrop-blur-sm", selectedNumbers.length === 0 && totalPages <= 1 && 'hidden')}
            >
              <div
                className={cn("w-[47px] h-[47px] grid justify-center items-center mx-auto bg-[#14b8a6] rounded-full cursor-pointer hover:bg-[#0d9488] transition-colors", selectedNumbers.length === 0 && 'hidden')}
                onClick={handleReserveNumbers}
              >
                <svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.4235 9.34772L25.1786 15.1057L19.4235 20.8622" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.47449 15.1071H25.1786" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={cn("flex justify-center items-center mt-3 z-10", totalPages <= 1 && 'hidden')}>
                <div className="flex items-center space-x-2 rounded-full p-1.5 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i)}
                      className={`rounded-full transition-all duration-200 cursor-pointer hover:opacity-80 ${i === currentPage
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
          </div>
        )}

      </div>

      {drawing.winnerSelection === 'random' && <div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:max-w-[600px] sm:mx-auto px-4">
          <Form formData={formData} setFormData={setFormData} drawing={drawing} />
          <div className="px-0 pb-4 flex justify-center">
            <Button
              type="submit"
              disabled={
                participateMutation.isPending
              }
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
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
      </div >}
      {/* Registration Form - Drawer */}
      <Drawer open={showForm} onOpenChange={setShowForm} dismissible={false}>
        <DrawerContent className="bg-white dark:bg-slate-800">
          <DrawerHeader>
            <DrawerTitle className="text-black dark:text-white">
              {drawing.winnerSelection === 'number' ? 'Confirm Your Registration' : 'Register for Drawing'}
            </DrawerTitle>
            {/* <DrawerDescription className="text-gray-600 dark:text-gray-400">
              Complete the form below to register for this drawing.
            </DrawerDescription> */}
          </DrawerHeader>

          <div className="px-4 overflow-y-auto max-h-[60vh]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Form formData={formData} setFormData={setFormData} drawing={drawing} />
              <DrawerFooter className="px-0 pb-4 grid grid-cols-2">
                <DrawerClose asChild>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleCancelReservation}
                  >
                    Cancel
                  </Button>
                </DrawerClose>
                <Button
                  type="submit"
                  disabled={
                    participateMutation.isPending ||
                    (drawing.winnerSelection === 'number' && selectedNumbers.length === 0)
                  }
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
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

              </DrawerFooter>
            </form>
          </div>
        </DrawerContent>
      </Drawer>


      {/* Help/Info Section */}
      <Card className="p-4 bg-white dark:bg-slate-800/30 dark:border-slate-700 sm:max-w-[600px] mx-auto mt-2 mb-4">
        <div className="flex items-start gap-3 text-sm text-gray-400">
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
            <p className="dark:text-white font-medium mb-1">How it works:</p>
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

      <style>{`
        #scrollContainer::-webkit-scrollbar,
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div >

  )
}