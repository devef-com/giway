import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  EllipsisVerticalIcon,
  // TrophyIcon,
  GripIcon,
  CopyIcon,
  Share2Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  RotateCcwIcon,
  SearchIcon,
  PencilIcon,
  XIcon,
} from 'lucide-react'
import { useState, useMemo, FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { useDrawing } from '@/querys/useDrawing'
import {
  useParticipants,
  type StatusFilter,
  type SortField,
  type SortOrder,
} from '@/querys/useParticipants'
import useMobile from '@/hooks/useMobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import {
  Expandable,
  ExpandableTitle,
  ExpandableContent,
} from '@/components/ui/expandable'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDateGiway, formatNumber } from '@/lib/utils'
import { useDrawingWinners } from '@/querys/useDrawingWinners'

export const Route = createFileRoute('/drawings/$drawingId/')({
  component: DrawingDetail,
})

function DrawingDetail() {
  const { drawingId } = Route.useParams()
  const session = authClient.useSession()
  const queryClient = useQueryClient()

  const navigate = useNavigate()

  const isMobile = useMobile()

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isSelectingWinners, setIsSelectingWinners] = useState(false)
  const [loadWinners, setLoadWinners] = useState(false)

  const [openRunWinners, setOpenRunWinners] = useState(false)

  // Filter and sorting state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [nameSearch, setNameSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const limit = 100

  const { data: drawing, isLoading: drawingLoading } = useDrawing(
    drawingId,
    !!session.data,
  )
  const { data: drawingWinners, isLoading: loadingWinners } = useDrawingWinners(
    drawingId,
    loadWinners,
  )

  const {
    data: participantsData,
    isLoading: participantsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useParticipants(drawingId, true, {
    status: statusFilter,
    name: nameSearch,
    limit,
    sortBy,
    sortOrder,
  })

  // Flatten all pages into a single array
  const participants = useMemo(() => {
    return participantsData?.pages.flatMap((page) => page.data) ?? []
  }, [participantsData?.pages])

  // Get pagination info from the last page
  const pagination =
    participantsData?.pages[participantsData.pages.length - 1]?.pagination

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // Handle filter changes
  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status)
  }

  const handleSearch = () => {
    if (searchInput.trim() === nameSearch) return
    setNameSearch(searchInput)
  }

  const handleResetFilters = () => {
    if (statusFilter === 'all' && nameSearch === '' && searchInput === '')
      return
    setStatusFilter('all')
    setNameSearch('')
    setSearchInput('')
  }

  const handleShowMore = () => {
    fetchNextPage()
  }

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDownIcon className="w-3 h-3 inline ml-1" />
    )
  }

  const handleSelectWinners = async (
    event?: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    let numbersToSubmit: number[] = []

    // Check if this is a form submission (has preventDefault and target is a form)
    if (event && 'preventDefault' in event) {
      event.preventDefault()

      // Only try to get form data if the target is actually a form element
      const target = event.target as HTMLElement
      if (target.tagName === 'FORM') {
        const formData = new FormData(target as HTMLFormElement)
        const winnerNumbers: number[] = []
        for (let i = 0; i < drawing!.winnersAmount; i++) {
          const numberStr = formData.get(`number_${i + 1}`)?.toString() || ''
          const number = parseInt(numberStr, 10)
          if (isNaN(number)) {
            toast.error(`Please enter a valid number for winner #${i + 1}`)
            return
          }
          winnerNumbers.push(number)
        }
        numbersToSubmit = winnerNumbers
      }
    }
    console.log('Selecting winners with numbers:', numbersToSubmit)

    setIsSelectingWinners(true)
    // return;
    try {
      const response = await fetch(
        `/api/drawings/${drawingId}/select-winners`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            winnerNumbers:
              numbersToSubmit.length > 0 ? numbersToSubmit : undefined,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to select winners')
      }

      toast.success(
        data.message ||
          `Successfully selected ${data.data.winners.length} winner(s)`,
      )
      setOpenRunWinners(false)
      queryClient.invalidateQueries({ queryKey: ['drawing', drawingId] })
      queryClient.invalidateQueries({
        queryKey: ['drawing-winners', drawingId],
      })

      // Optionally navigate to winners view or refresh data
      // navigate({ to: `/drawings/${drawingId}/winners` })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to select winners',
      )
    } finally {
      setIsSelectingWinners(false)
    }
  }

  const ACTIONS = [
    {
      label: 'Edit',
      icon: PencilIcon,
      onClick: () => {
        navigate({ to: `/drawings/${drawingId}/edit` })
        setIsPopoverOpen(false)
      },
    },
    // {
    //   label: 'More Options',
    //   icon: TrophyIcon,
    //   onClick: () => {
    //     setIsPopoverOpen(false)
    //   },
    // },
    {
      label: 'Numbers',
      icon: GripIcon,
      onClick: () => {
        navigate({ to: `/slot/${drawingId}` })
        setIsPopoverOpen(false)
      },
    },
    {
      label: 'Copy Link',
      icon: CopyIcon,
      onClick: () => {
        const url = `${window.location.origin}/slot/${drawing?.id}`
        navigator.clipboard.writeText(url).then(() => {
          toast.success('Link copied to clipboard!')
        })
        setIsPopoverOpen(false)
      },
    },
    {
      label: 'Share',
      icon: Share2Icon,
      onClick: () => {
        const url = `${window.location.origin}/slot/${drawing?.id}`
        navigator
          .share({
            title: 'Join my drawing!',
            text: drawing?.title,
            url: url,
          })
          .catch(() => {
            // Handle share failure or cancellation
            console.log('Share failed or was cancelled')
          })
        setIsPopoverOpen(false)
      },
    },
  ]

  if (!session.data && !session.isPending) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6">
            <p className="text-white text-center">
              Please log in to view this drawing.{' '}
              <a
                href="/authentication/login"
                className="text-cyan-400 hover:text-cyan-300"
              >
                Login
              </a>
            </p>
          </Card>
        </div>
      </div>
    )
  }

  if (!session.data || drawingLoading) {
    return (
      <div className="min-h-[calc(100svh-129px)] p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Main card skeleton */}
          <Card className="p-4 min-h-40">
            <Skeleton className="w-full h-16 rounded-xl bg-slate-800/50 border-slate-700 mb-1" />
            <Skeleton className="w-full h-16 rounded-xl bg-slate-800/50 border-slate-700" />
          </Card>
          <Card className="p-4 min-h-40">
            <Skeleton className="w-full h-16 rounded-xl bg-slate-800/50 border-slate-700 mb-1" />
            <Skeleton className="w-full h-26 rounded-xl bg-slate-800/50 border-slate-700" />
          </Card>
        </div>
      </div>
    )
  }

  if (!drawing) {
    return (
      <div className="min-h-[calc(100svh-129px)] p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center">Drawing not found</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100svh-129px)] p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="p-4 border-slate-700 mb-6 gap-2">
          <div className="grid grid-cols-[1fr_auto]">
            <h1 className="text-md font-bold">{drawing.title}</h1>
            <div className="self-end">
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <EllipsisVerticalIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  {ACTIONS.map((action, index) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={index}
                        onClick={action.onClick}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-sm"
                      >
                        <Icon className="w-4 h-4" />
                        {action.label}
                      </button>
                    )
                  })}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Expandable>
            <ExpandableTitle>Basic Info</ExpandableTitle>
            <ExpandableContent className="border-b border-slate-700">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-sm">
                    <strong>Type:</strong>{' '}
                    {drawing.isPaid && drawing.price
                      ? `Paid ($${formatNumber(drawing.price ?? 0)})`
                      : 'Free'}
                  </p>
                  <p className="mb-2  text-sm">
                    <strong>Selection Method:</strong>{' '}
                    {drawing.winnerSelection === 'manually'
                      ? 'Enter number manually'
                      : 'System generated'}
                  </p>
                  <p className="mb-2 text-sm">
                    <strong>Play with Numbers:</strong>{' '}
                    {drawing.playWithNumbers ? 'Yes' : 'No'}
                  </p>
                  {drawing.playWithNumbers && (
                    <p className="mb-2 text-sm">
                      <strong>Total Numbers:</strong>{' '}
                      {drawing.quantityOfNumbers}
                    </p>
                  )}
                  <p className="mb-2 text-sm">
                    <strong>End Date:</strong>{' '}
                    {new Date(drawing.endAt).toLocaleString(navigator.language)}
                  </p>
                </div>
                {drawing.guidelines && drawing.guidelines.length > 0 && (
                  <div>
                    <strong className="">Guidelines:</strong>
                    <ul className="list-disc list-inside text-sm mt-2">
                      {drawing.guidelines.map(
                        (guideline: string, index: number) => (
                          <li key={index}>{guideline}</li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </ExpandableContent>
          </Expandable>

          <Expandable>
            <ExpandableTitle>Winner Selection</ExpandableTitle>
            <ExpandableContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Selection Method:</strong>{' '}
                    {drawing.winnerSelection === 'manually'
                      ? 'Enter number manually'
                      : 'System generated'}
                  </p>
                  <p className="text-sm">
                    <strong>Winners to Select:</strong> {drawing.winnersAmount}
                  </p>
                  <p className="text-sm">
                    <strong>Eligible Participants:</strong>{' '}
                    {participants?.filter((p) => p.isEligible === true)
                      .length || 0}
                  </p>
                  {drawing.playWithNumbers &&
                    drawing.winnerSelection === 'manually' && (
                      <p className="text-sm">
                        <strong>Winner Numbers:</strong>{' '}
                        {drawing.winnerNumbers?.join(', ') || 'Not set'}
                      </p>
                    )}
                </div>
                {drawing.winnerNumbers && drawing.winnerNumbers.length > 0 && (
                  <Expandable
                    className="mb-2"
                    onClick={() => setLoadWinners(true)}
                  >
                    <ExpandableTitle>
                      Winners #({drawing.winnerNumbers.join(', ')})
                    </ExpandableTitle>
                    <ExpandableContent>
                      {loadingWinners && <span>...</span>}
                      {drawingWinners?.winners.map((winner) => (
                        <div key={winner.participantId} className="mb-2 ml-4">
                          <Link
                            resetScroll={false}
                            className="text-sm underline"
                            to={'/drawings/$drawingId/m/$participant'}
                            params={{
                              drawingId: drawingId,
                              participant: winner.participantId.toString(),
                            }}
                          >
                            {winner.participantName}
                          </Link>
                        </div>
                      ))}
                      <pre className="hidden text-sm">
                        {JSON.stringify(drawingWinners, null, 2)}
                      </pre>
                    </ExpandableContent>
                  </Expandable>
                )}
                <div
                  className={cn(
                    'flex justify-center md:justify-end w-full',
                    openRunWinners || drawing.winnerSelection != 'manually'
                      ? 'hidden'
                      : '',
                  )}
                >
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setOpenRunWinners(true)}
                  >
                    Run Winner Selection
                  </Button>
                </div>
                {drawing.winnerSelection === 'manually' && (
                  <form
                    className={cn(
                      'flex flex-wrap gap-2 place-content-end',
                      openRunWinners ? '' : 'hidden',
                    )}
                    onSubmit={handleSelectWinners}
                  >
                    <Button
                      variant="outline"
                      onClick={() => setOpenRunWinners(false)}
                    >
                      <XIcon />
                    </Button>
                    {Array.from({ length: drawing.winnersAmount }).map(
                      (_, index) => (
                        <Input
                          min={0}
                          key={index}
                          type="number"
                          required
                          id={index.toString()}
                          name={`number_${index + 1}`}
                          className="border border-slate-700 text-sm rounded-md p-2 w-24 mr-2 mb-2"
                          placeholder={`#${index + 1} Winner`}
                        />
                      ),
                    )}
                    <Button type="submit">Save</Button>
                  </form>
                )}

                <div
                  className={cn(
                    'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3',
                    drawing.winnerSelection === 'manually' ? 'hidden' : '',
                  )}
                >
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> This will select winners based on
                    your drawing configuration. You can re-run the selection if
                    needed.
                  </p>
                </div>

                <div
                  className={cn(
                    'flex justify-center md:justify-end w-full',
                    drawing.winnerSelection === 'manually' ? 'hidden' : '',
                  )}
                >
                  <Button
                    onClick={handleSelectWinners}
                    disabled={isSelectingWinners}
                    className="md:max-w-max"
                  >
                    {isSelectingWinners
                      ? 'Selecting Winners...'
                      : 'Select Winners'}
                  </Button>
                </div>
              </div>
            </ExpandableContent>
          </Expandable>
        </Card>

        <Card className="p-4 border-slate-700">
          <h2 className="text-xl font-bold">
            Participants ({pagination?.total || participants?.length || 0})
          </h2>

          {/* Filters Expandable */}
          <Expandable defaultOpen>
            <ExpandableTitle>filters</ExpandableTitle>
            <ExpandableContent>
              <div className="space-y-4 mt-1">
                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-2">
                  {(
                    ['all', 'pending', 'rejected', 'approved'] as StatusFilter[]
                  ).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusFilterChange(status)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                        statusFilter === status
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {/* {status === 'all' && '• '} */}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Name Search */}
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Search by name"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch()
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleResetFilters}
                    title="Reset filters"
                  >
                    <RotateCcwIcon className="w-4 h-4" />
                  </Button>
                  <Button onClick={handleSearch} size="icon">
                    <SearchIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </ExpandableContent>
          </Expandable>

          <div className="overflow-x-auto">
            <table className="w-full ">
              <thead>
                <tr className="border-b border-slate-700">
                  <th
                    className="text-left p-2 cursor-pointer hover:bg-accent/50 select-none"
                    onClick={() => handleSort('name')}
                  >
                    Name
                    <SortIndicator field="name" />
                  </th>
                  {/* <th className="text-left p-2">Phone</th> */}
                  {drawing.playWithNumbers && (
                    <th className="text-left p-2">#</th>
                  )}
                  <th
                    className="text-left p-2 cursor-pointer hover:bg-accent/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    <SortIndicator field="status" />
                  </th>
                  <th
                    className="text-left p-2 cursor-pointer hover:bg-accent/50 select-none"
                    onClick={() => handleSort('createdAt')}
                  >
                    Date
                    <SortIndicator field="createdAt" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {participantsLoading && participants.length === 0 ? (
                  // Skeleton rows while loading
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr
                      key={`skeleton-${index}`}
                      className="border-b border-slate-700"
                    >
                      <td className="p-2">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      {drawing.playWithNumbers && (
                        <td className="p-2">
                          <Skeleton className="h-4 w-8" />
                        </td>
                      )}
                      <td className="p-2">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="p-2">
                        <Skeleton className="h-4 w-20" />
                      </td>
                    </tr>
                  ))
                ) : participants && participants.length > 0 ? (
                  participants.map((participant) => (
                    <tr
                      key={participant.id}
                      className="border-b border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800"
                      onClick={() =>
                        navigate({
                          to: `/drawings/${drawingId}/m/${participant.id}`,
                          //@ts-ignore
                          state: participant,
                        })
                      }
                    >
                      <td className="p-2 text-sm">
                        {isMobile
                          ? participant.name.trim().length > 7
                            ? participant.name.substring(0, 7) + '...'
                            : participant.name
                          : participant.name}
                      </td>
                      {/* <td className="p-2">{participant.phone}</td> */}
                      {drawing.playWithNumbers && (
                        <td className="p-2 text-sm">
                          {participant.numbers?.length > 0 ? (
                            isMobile && participant.numbers.length > 2 ? (
                              <>
                                {participant.numbers.slice(0, 2).join('-')}{' '}
                                <span className="text-blue-400">
                                  +{participant.numbers.length - 2}
                                </span>
                              </>
                            ) : (
                              participant.numbers.join('-')
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                      )}
                      <td className="p-2 text-sm">
                        {participant.isEligible === null ? (
                          <span className="text-yellow-400">Pending</span>
                        ) : participant.isEligible ? (
                          <span className="text-green-400">Approved</span>
                        ) : (
                          <span className="text-red-400">Rejected</span>
                        )}
                      </td>
                      <td className="p-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {formatDateGiway(
                          participant.createdAt as unknown as string,
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={drawing.playWithNumbers ? 4 : 3}
                      className="p-4 text-center text-text-light-secondary dark:text-text-dark-secondary"
                    >
                      No participants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Info & Show More */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {participants.length} of{' '}
                {pagination?.total || participants.length}
              </span>
              {hasNextPage && (
                <button
                  onClick={handleShowMore}
                  disabled={isFetchingNextPage}
                  className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading...' : 'show more'}
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
