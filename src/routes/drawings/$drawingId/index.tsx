import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { EllipsisVerticalIcon, TrophyIcon } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { useDrawing } from '@/querys/useDrawing'
import { useParticipants } from '@/querys/useParticipants'
import useMobile from '@/hooks/useMobile'
import { Button } from '@/components/ui/button'
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

export const Route = createFileRoute('/drawings/$drawingId/')({
  component: DrawingDetail,
})

function DrawingDetail() {
  const { drawingId } = Route.useParams()
  const session = authClient.useSession()

  const navigate = useNavigate()

  const isMobile = useMobile()

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isSelectingWinners, setIsSelectingWinners] = useState(false)

  const { data: drawing, isLoading: drawingLoading } = useDrawing(
    drawingId,
    !!session.data,
  )

  const { data: participants, isLoading: participantsLoading } =
    useParticipants(drawingId, !!session.data)

  const handleSelectWinners = async () => {
    setIsSelectingWinners(true)
    try {
      const response = await fetch(
        `/api/drawings/${drawingId}/select-winners`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to select winners')
      }

      toast.success(
        data.message || `Successfully selected ${data.data.winners.length} winner(s)`,
      )

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

  if (!session.data) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
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

  if (drawingLoading || participantsLoading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center">Loading...</p>
          </Card>
        </div>
      </div>
    )
  }

  if (!drawing) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center">Drawing not found</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
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
                  <button
                    onClick={() => {
                      setIsPopoverOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-sm"
                  >
                    <TrophyIcon className="w-4 h-4" />
                    More Options
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Expandable>
            <ExpandableTitle>Basic Info</ExpandableTitle>
            <ExpandableContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-sm">
                    <strong>Type:</strong>{' '}
                    {drawing.isPaid && drawing.price
                      ? `Paid ($${(drawing.price / 100).toFixed(2)})`
                      : 'Free'}
                  </p>
                  <p className="mb-2  text-sm">
                    <strong>Selection Method:</strong>{' '}
                    {drawing.winnerSelection === 'random' ? 'Random' : 'By Number'}
                  </p>
                  {drawing.winnerSelection === 'number' && (
                    <p className="mb-2 text-sm">
                      <strong>Total Numbers:</strong> {drawing.quantityOfNumbers}
                    </p>
                  )}
                  <p className="mb-2 text-sm">
                    <strong>End Date:</strong>{' '}
                    {new Date(drawing.endAt).toLocaleString()}
                  </p>
                </div>
                <div>
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
                    {drawing.winnerSelection === 'random' ? 'Random' : 'By Number'}
                  </p>
                  <p className="text-sm">
                    <strong>Winners to Select:</strong> {drawing.winnersAmount}
                  </p>
                  <p className="text-sm">
                    <strong>Eligible Participants:</strong>{' '}
                    {participants?.filter((p) => p.isEligible === true).length || 0}
                  </p>
                  {drawing.winnerSelection === 'number' && (
                    <p className="text-sm">
                      <strong>Winner Numbers:</strong>{' '}
                      {drawing.isWinnerNumberRandom
                        ? 'Random (will be generated)'
                        : drawing.winnerNumbers?.join(', ') || 'Not set'}
                    </p>
                  )}
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> This will select winners based on your
                    drawing configuration. You can re-run the selection if needed.
                  </p>
                </div>

                <Button
                  onClick={handleSelectWinners}
                  disabled={isSelectingWinners}
                  className="w-full"
                >
                  {isSelectingWinners ? 'Selecting Winners...' : 'Select Winners'}
                </Button>
              </div>
            </ExpandableContent>
          </Expandable>
        </Card>

        <Card className="p-6 border-slate-700">
          <h2 className="text-xl font-bold">
            Participants ({participants?.length || 0})
          </h2>

          {participants && participants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full ">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-2">Name</th>
                    {/* <th className="text-left p-2">Phone</th> */}
                    {drawing.winnerSelection === 'number' && (
                      <th className="text-left p-2">#</th>
                    )}
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
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
                      {drawing.winnerSelection === 'number' && (
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
                        {new Intl.DateTimeFormat(navigator.language, {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(participant.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-secondary text-center">No participants yet</p>
          )}
        </Card>
      </div>
    </div>
  )
}
