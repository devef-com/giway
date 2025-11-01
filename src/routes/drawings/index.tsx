import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/drawings/')({
  component: DrawingsList,
})

function DrawingsList() {
  const session = authClient.useSession()

  const { data: drawings, isLoading } = useQuery({
    queryKey: ['drawings'],
    queryFn: async () => {
      const response = await fetch('/api/drawings')
      if (!response.ok) throw new Error('Failed to fetch drawings')
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
              Please log in to view your drawings.{' '}
              <a href="/authentication/login" className="text-cyan-400 hover:text-cyan-300">
                Login
              </a>
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">My Drawings</h1>
          <Link to="/drawings/create">
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
              Create New Drawing
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center">Loading...</p>
          </Card>
        ) : drawings && drawings.length > 0 ? (
          <div className="grid gap-4">
            {drawings.map((drawing: any) => (
              <Card
                key={drawing.id}
                className="p-6 bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                      {drawing.title}
                    </h2>
                    <p className="text-gray-400 mb-2">
                      Selection: {drawing.winnerSelection === 'random' ? 'Random' : 'By Number'}
                    </p>
                    {drawing.winnerSelection === 'number' && (
                      <p className="text-gray-400 mb-2">
                        Numbers: {drawing.quantityOfNumbers}
                      </p>
                    )}
                    <p className="text-gray-400 mb-2">
                      Type: {drawing.isPaid ? `Paid ($${(drawing.price / 100).toFixed(2)})` : 'Free'}
                    </p>
                    <p className="text-gray-400">
                      End Date: {new Date(drawing.endAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/drawings/${drawing.id}`}>
                      <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                        View
                      </Button>
                    </Link>
                    <Button
                      onClick={() => {
                        const url = `${window.location.origin}/join/${drawing.id}`
                        navigator.clipboard.writeText(url)
                        alert('Link copied to clipboard!')
                      }}
                      className="bg-slate-600 hover:bg-slate-700 text-white"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center">
              No drawings yet.{' '}
              <Link to="/drawings/create" className="text-cyan-400 hover:text-cyan-300">
                Create your first drawing
              </Link>
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
