import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/drawings/$drawingId')({
  component: DrawingDetail,
})

function DrawingDetail() {
  const { drawingId } = Route.useParams()
  const session = authClient.useSession()

  const { data: drawing, isLoading: drawingLoading } = useQuery({
    queryKey: ['drawing', drawingId],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/${drawingId}`)
      if (!response.ok) throw new Error('Failed to fetch drawing')
      return response.json()
    },
    enabled: !!session.data,
  })

  const { data: participants, isLoading: participantsLoading } = useQuery({
    queryKey: ['participants', drawingId],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/${drawingId}/participants`)
      if (!response.ok) throw new Error('Failed to fetch participants')
      return response.json()
    },
    enabled: !!session.data,
  })

  if (!session.data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center">
              Please log in to view this drawing.{' '}
              <a href="/authentication/login" className="text-cyan-400 hover:text-cyan-300">
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center">Drawing not found</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="p-6 bg-slate-800/50 border-slate-700 mb-6">
          <h1 className="text-3xl font-bold text-white mb-4">{drawing.title}</h1>
          
          <div className="grid md:grid-cols-2 gap-4 text-white">
            <div>
              <p className="text-gray-400 mb-2">
                <strong>Type:</strong> {drawing.isPaid ? `Paid ($${(drawing.price / 100).toFixed(2)})` : 'Free'}
              </p>
              <p className="text-gray-400 mb-2">
                <strong>Selection Method:</strong> {drawing.winnerSelection === 'random' ? 'Random' : 'By Number'}
              </p>
              {drawing.winnerSelection === 'number' && (
                <p className="text-gray-400 mb-2">
                  <strong>Total Numbers:</strong> {drawing.quantityOfNumbers}
                </p>
              )}
              <p className="text-gray-400 mb-2">
                <strong>End Date:</strong> {new Date(drawing.endAt).toLocaleString()}
              </p>
            </div>
            <div>
              {drawing.guidelines && drawing.guidelines.length > 0 && (
                <div>
                  <strong className="text-white">Guidelines:</strong>
                  <ul className="list-disc list-inside text-gray-400 mt-2">
                    {drawing.guidelines.map((guideline: string, index: number) => (
                      <li key={index}>{guideline}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            Participants ({participants?.length || 0})
          </h2>

          {participants && participants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Phone</th>
                    {drawing.winnerSelection === 'number' && (
                      <th className="text-left p-2">Number</th>
                    )}
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant: any) => (
                    <tr key={participant.id} className="border-b border-slate-700">
                      <td className="p-2">{participant.name}</td>
                      <td className="p-2">{participant.phone}</td>
                      {drawing.winnerSelection === 'number' && (
                        <td className="p-2">{participant.selectedNumber || '-'}</td>
                      )}
                      <td className="p-2">
                        {participant.isEligible === null ? (
                          <span className="text-yellow-400">Pending</span>
                        ) : participant.isEligible ? (
                          <span className="text-green-400">Approved</span>
                        ) : (
                          <span className="text-red-400">Rejected</span>
                        )}
                      </td>
                      <td className="p-2">
                        {new Date(participant.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center">No participants yet</p>
          )}
        </Card>
      </div>
    </div>
  )
}
