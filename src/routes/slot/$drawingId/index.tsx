import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  CircleAlert,
  ImageIcon,
  InfoIcon,
  Trophy,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

import { cn } from '@/lib/utils'
import DrawingSlotHeader from '@/components/DrawingSlotHeader'
import { useDrawingStats } from '@/querys/useDrawingStats'
import { useNumberSlots } from '@/querys/useNumberSlots'
import { useReservationTime } from '@/querys/useReservationTime'
import { useParticipate } from '@/querys/useParticipate'
import { useDrawingWinners } from '@/querys/useDrawingWinners'
import { Drawing, drawings, drawingAssets, assets } from '@/db/schema'
import { db } from '@/db/index'
import { eq, desc } from 'drizzle-orm'

const getDrawing = createServerFn({
  method: 'GET',
})
  .inputValidator((drawingId: string) => drawingId)
  .handler(async ({ data: drawingId }) => {
    const result = await db
      .select({
        drawing: drawings,
        asset: assets,
        isCover: drawingAssets.isCover,
      })
      .from(drawings)
      .leftJoin(drawingAssets, eq(drawingAssets.drawingId, drawings.id))
      .leftJoin(assets, eq(assets.id, drawingAssets.assetId))
      .where(eq(drawings.id, drawingId))
      .orderBy(desc(drawingAssets.isCover)) // Cover image comes first

    if (result.length === 0) {
      return null
    }

    // Get the drawing data from the first result
    const drawingData = result[0].drawing

    // Collect all assets with cover info (filter out nulls from left join)
    const drawingAssetsList = result
      .map((r) =>
        r.asset ? { ...r.asset, isCover: r.isCover ?? false } : null,
      )
      .filter((a): a is NonNullable<typeof a> => a !== null)

    return { ...drawingData, assets: drawingAssetsList }
  })

type Asset = typeof assets.$inferSelect & { isCover: boolean }

export const Route = createFileRoute('/slot/$drawingId/')({
  component: SlotDrawingParticipation,
  loader: async ({ params }): Promise<Drawing & { assets: Asset[] }> => {
    if (!params.drawingId) {
      throw new Response('Drawing ID is required', { status: 400 })
    }

    const drawing = await getDrawing({ data: params.drawingId })

    if (!drawing) {
      throw new Response('Drawing not found', { status: 404 })
    }

    return drawing
  },
  head: (ctx) => {
    const title = `Join Giway - ${ctx.loaderData?.title || ''}`
    const description = `Join the giway for ${ctx.loaderData?.title || 'this event'}. ${ctx.loaderData?.playWithNumbers ? 'Reserve your number(s) and participate now!' : 'Participate now'}`

    // Prefer cover image, fallback to first image
    const coverImage = ctx.loaderData?.assets?.find((a) => a.isCover)?.url
    const ogImage = coverImage || ctx.loaderData?.assets?.[0]?.url

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        // Open Graph tags for social sharing (WhatsApp, Facebook, etc.)
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        ...(ogImage
          ? [
              { property: 'og:image', content: ogImage },
              { property: 'og:image:width', content: '1200' }, // 1.91:1 aspect ratio - width should be 1.9 X the height
              { property: 'og:image:height', content: '630' },
            ]
          : []),
        // Twitter Card tags
        {
          name: 'twitter:card',
          content: ogImage ? 'summary_large_image' : 'summary',
        },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        ...(ogImage ? [{ name: 'twitter:image', content: ogImage }] : []),
      ],
    }
  },
})

interface FormProps {
  formData: {
    name: string
    email: string
    phone: string
  }
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string
      email: string
      phone: string
    }>
  >
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
            <CircleAlert className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                Payment Required
              </p>
              <p className="text-yellow-700 dark:text-yellow-100 text-sm mt-1">
                This is a paid event. Attach your payment proof to confirm your
                participation.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SlotDrawingParticipation() {
  const drawing = Route.useLoaderData()
  const { drawingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedNumbers, setSelectedNumbers] = useState<Array<number>>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const floatingControlsRef = useRef<HTMLDivElement>(null)

  const NUMBERS_PER_PAGE = 6 * 17 // 6 columns × 17 rows = 102 numbers per page

  const { data: reservationTimeData } = useReservationTime()

  // Fetch drawing details
  // const { data: drawing, isLoading: drawingLoading } = useDrawing(drawingId)

  // Check if drawing has ended
  const hasDrawingEnded = drawing ? new Date(drawing.endAt) < new Date() : false

  // Fetch winners if drawing has ended
  const { data: winnersData, isLoading: winnersLoading } = useDrawingWinners(
    drawingId,
    hasDrawingEnded,
  )

  // Fetch drawing statistics
  const { data: stats } = useDrawingStats(
    drawingId,
    !!drawing && !!drawing.playWithNumbers,
    10000,
  )

  // Calculate total pages
  const totalPages = drawing
    ? Math.ceil(drawing.quantityOfNumbers / NUMBERS_PER_PAGE)
    : 0

  // Fetch slots for current page and adjacent pages (batched loading for optimization)
  // Memoize the numbers calculation to avoid unnecessary recalculations
  const numbersToFetch = useMemo(() => {
    if (!drawing) return []

    const pagesToFetch = [
      Math.max(0, currentPage - 1),
      currentPage,
      Math.min(totalPages - 1, currentPage + 1),
    ].filter((page, index, array) => array.indexOf(page) === index) // Remove duplicates

    const numbers: Array<number> = []
    pagesToFetch.forEach((page) => {
      const startIdx = page * NUMBERS_PER_PAGE
      const endIdx = Math.min(
        startIdx + NUMBERS_PER_PAGE,
        drawing.quantityOfNumbers,
      )
      for (let i = startIdx; i < endIdx; i++) {
        numbers.push(i + 1)
      }
    })

    return numbers
  }, [drawing?.quantityOfNumbers, currentPage])

  const { data: slotsData } = useNumberSlots(
    drawingId,
    numbersToFetch,
    !!drawing && !!drawing.playWithNumbers && !hasDrawingEnded,
    {
      staleTime: 30000,
      refetchOnWindowFocus: true,
    },
  )

  // Clear selections when returning to this page (e.g., user went back from reservation page)
  useEffect(() => {
    // Clear any selected numbers when page mounts/becomes visible again
    setSelectedNumbers([])

    // Invalidate slots query to refresh the grid and show any released numbers
    queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })
  }, [drawingId, queryClient])

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
        setSelectedNumbers(selectedNumbers.filter((n) => n !== number))
        return
      }
      setSelectedNumbers([...selectedNumbers, number])
    }
  }

  // Navigate to form page with selected numbers
  const handleReserveNumbers = async () => {
    if (selectedNumbers.length === 0) return

    try {
      // Reserve all selected numbers before navigation
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

        // Verify it was stored
        const verified = localStorage.getItem(reservationKey)
        if (!verified) {
          console.error('Failed to store reservation in localStorage')
          toast.error('Failed to save reservation. Please try again.')
          setSelectedNumbers([])
          return
        }

        console.log('Reservation key:', reservationKey)
        console.log('Reserved numbers:', selectedNumbers)
        console.log('Stored in localStorage:', verified)

        // Invalidate slots cache to show updated status
        queryClient.invalidateQueries({ queryKey: ['number-slots', drawingId] })

        // Navigate to the form page with reserved state
        navigate({
          to: '/slot/$drawingId/$numberToReserve',
          params: {
            drawingId,
            numberToReserve: selectedNumbers.join(','),
          },
        })
      } else {
        toast.error('Some numbers could not be reserved. Please try again.')
        setSelectedNumbers([])
      }
    } catch (error) {
      console.error('Error reserving numbers:', error)
      toast.error('An error occurred while reserving numbers')
      setSelectedNumbers([])
    }
  }

  // Submit registration mutation
  const participateMutation = useParticipate(drawingId, () => {
    navigate({ to: '/' })
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const registrationData = {
      ...formData,
      selectedNumbers: drawing?.playWithNumbers ? selectedNumbers : undefined,
    }

    participateMutation.mutate(registrationData)
  }

  // Drawing not found
  if (!drawing) {
    return (
      <div className="min-h-screenp-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center text-xl">Drawing not found</p>
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
    <div className="relative bg-background-light dark:bg-background-dark font-display min-h-screen">
      {/* <pre>
        {JSON.stringify(drawing, null, 2)}
      </pre> */}
      <div className="flex w-full flex-col p-4 sm:max-w-[600px] sm:mx-auto">
        {/* Drawing Details Card */}
        <DrawingSlotHeader
          drawing={drawing}
          stats={stats}
          hasEnded={hasDrawingEnded}
        />
        <div className="grid grid-cols-[max-content_1fr] items-center gap-4 mb-4">
          {drawing.assets && drawing.assets.length > 0 ? (
            <div
              className="relative w-[120px] h-[120px] rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => {
                setGalleryIndex(0)
                setGalleryOpen(true)
              }}
            >
              <img
                src={drawing.assets[0].url}
                alt={drawing.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {drawing.assets.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  +{drawing.assets.length - 1}
                </div>
              )}
            </div>
          ) : (
            <div className="w-[120px] h-[120px] rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ImageIcon
                size={48}
                strokeWidth={0.7}
                className="text-gray-400"
              />
            </div>
          )}
          {drawing.guidelines && drawing.guidelines.length > 0 && (
            <div>
              <h2 className="font-regular mb-2 text-text-light-primary dark:text-text-dark-primary">
                Guidelines
              </h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {drawing.guidelines.map((guideline, index) => (
                  <li key={index}>{guideline}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {/* Winners Section - shown when drawing has ended */}
        {hasDrawingEnded && (
          <Card className="p-4 mb-4 bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border-amber-200 dark:border-amber-700">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                Drawing Ended
              </h2>
            </div>
            {winnersLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                <span className="ml-2 text-amber-700 dark:text-amber-300">
                  Loading winners...
                </span>
              </div>
            ) : winnersData?.winners && winnersData.winners.length > 0 ? (
              <div>
                <p className="text-amber-700 dark:text-amber-300 mb-3">
                  🎉 Congratulations to the winner
                  {winnersData.winners.length > 1 ? 's' : ''}!
                </p>
                {winnersData.winnerNumbers &&
                  winnersData.winnerNumbers.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">
                        Winning number
                        {winnersData.winnerNumbers.length > 1 ? 's' : ''}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {winnersData.winnerNumbers.map((num) => (
                          <span
                            key={num}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500 text-white font-bold"
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                <ul className="space-y-2">
                  {winnersData.winners.map((winner, index) => (
                    <li
                      key={winner.participantId}
                      className="flex items-center gap-2 p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg"
                    >
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        #{index + 1}
                      </span>
                      <span className="text-amber-800 dark:text-amber-200">
                        {winner.participantName}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-amber-700 dark:text-amber-300">
                Winners have not been selected yet. Check back soon!
              </p>
            )}
          </Card>
        )}

        {/* Number Selection Grid (only for drawings with numbers that haven't ended) */}
        {drawing.playWithNumbers && !hasDrawingEnded && (
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
                  const endIdx = Math.min(
                    startIdx + NUMBERS_PER_PAGE,
                    drawing.quantityOfNumbers,
                  )
                  const pageNumbers = Array.from(
                    { length: endIdx - startIdx },
                    (_unused, i) => startIdx + i + 1,
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
                          const slot = slotsData?.slots.find(
                            (s) => s.number === number,
                          )
                          const isSelected = selectedNumbers.includes(number)
                          const isAvailable =
                            !slot || slot.status === 'available'
                          const isTaken = slot?.status === 'taken'
                          const isReserved = slot?.status === 'reserved'

                          return (
                            <button
                              key={number}
                              onClick={() =>
                                isAvailable && handleNumberSelect(number)
                              }
                              disabled={!isAvailable}
                              className={`
                                aspect-square w-full px-0 py-0 rounded-lg flex items-center justify-center 
                                text-xl font-normal transition-colors duration-200 cursor-pointer
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
                                boxShadow:
                                  '0px 2px 0px 0px rgba(216,216,216,0.25)',
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
              className={cn(
                'p-2 rounded-lg z-10 bg-linear-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 backdrop-blur-sm',
                selectedNumbers.length === 0 && totalPages <= 1 && 'hidden',
              )}
            >
              <div
                className={cn(
                  'w-[47px] h-[47px] grid justify-center items-center mx-auto bg-[#14b8a6] rounded-full cursor-pointer hover:bg-[#0d9488] transition-colors',
                  selectedNumbers.length === 0 && 'hidden',
                )}
                onClick={handleReserveNumbers}
              >
                <svg
                  width="31"
                  height="31"
                  viewBox="0 0 31 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M19.4235 9.34772L25.1786 15.1057L19.4235 20.8622"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.47449 15.1071H25.1786"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div
                className={cn(
                  'flex justify-center items-center mt-3 z-10',
                  totalPages <= 1 && 'hidden',
                )}
              >
                <div className="flex items-center space-x-2 rounded-full p-1.5 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i)}
                      className={`rounded-full transition-all duration-200 cursor-pointer hover:opacity-80 ${
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
          </div>
        )}
      </div>

      {/* Registration Form for Drawing without numbers - Drawer */}
      {!drawing.playWithNumbers && (
        <div>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 sm:max-w-[600px] sm:mx-auto px-4"
          >
            <Form
              formData={formData}
              setFormData={setFormData}
              drawing={drawing}
            />
            <div className="px-0 pb-4 flex justify-center">
              <Button
                type="submit"
                disabled={participateMutation.isPending}
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
        </div>
      )}
      <div className="px-2">
        {/* Help/Info Section */}
        <Card className="p-4 gap-2 bg-white dark:bg-slate-800/30 dark:border-slate-700 sm:max-w-[600px] mx-auto mt-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <InfoIcon className="w-5 h-5 text-cyan-400" />
            <p className="text-text-light-primary dark:text-text-dark-primary font-medium ">
              How it works:
            </p>
          </div>
          <ul className="space-y-1 ml-4 text-sm text-gray-600 dark:text-gray-400">
            {drawing.playWithNumbers ? (
              <>
                <li>
                  • Select {drawing.isPaid ? 'one or more numbers' : 'a number'}{' '}
                  from the grid
                </li>
                <li>• Click the arrow button to proceed</li>
                <li>
                  • Your {drawing.isPaid ? 'numbers' : 'number'} will be
                  reserved for{' '}
                  {reservationTimeData?.reservationTimeMinutes || 4} minutes
                </li>
                <li>• Complete the registration form with your details</li>
                {drawing.isPaid && (
                  <li>• Upload payment proof to confirm your participation</li>
                )}
                <li>• Wait for the drawing date to see if you win!</li>
              </>
            ) : (
              <>
                <li>• Fill out the registration form with your details</li>
                {drawing.isPaid && (
                  <li>• Upload payment proof to confirm your participation</li>
                )}
                <li>
                  • The winner will be selected randomly on the drawing date
                </li>
              </>
            )}
          </ul>
        </Card>
      </div>

      <style>{`
        #scrollContainer::-webkit-scrollbar,
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Image Gallery Modal */}
      {galleryOpen && drawing.assets && drawing.assets.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setGalleryOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={() => setGalleryOpen(false)}
          >
            <X size={32} />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 text-white text-sm">
            {galleryIndex + 1} / {drawing.assets.length}
          </div>

          {/* Previous button */}
          {drawing.assets.length > 1 && (
            <button
              className="absolute left-4 text-white hover:text-gray-300 p-2 disabled:opacity-30"
              onClick={(e) => {
                e.stopPropagation()
                setGalleryIndex((prev) =>
                  prev > 0 ? prev - 1 : drawing.assets.length - 1,
                )
              }}
            >
              <ChevronLeft size={40} />
            </button>
          )}

          {/* Main image */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={drawing.assets[galleryIndex].url}
              alt={`${drawing.title} - Image ${galleryIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>

          {/* Next button */}
          {drawing.assets.length > 1 && (
            <button
              className="absolute right-4 text-white hover:text-gray-300 p-2 disabled:opacity-30"
              onClick={(e) => {
                e.stopPropagation()
                setGalleryIndex((prev) =>
                  prev < drawing.assets.length - 1 ? prev + 1 : 0,
                )
              }}
            >
              <ChevronRight size={40} />
            </button>
          )}

          {/* Thumbnail strip */}
          {drawing.assets.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg">
              {drawing.assets.map((asset, index) => (
                <button
                  key={asset.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setGalleryIndex(index)
                  }}
                  className={cn(
                    'w-12 h-12 rounded overflow-hidden border-2 transition-all',
                    index === galleryIndex
                      ? 'border-white scale-110'
                      : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                >
                  <img
                    src={asset.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
