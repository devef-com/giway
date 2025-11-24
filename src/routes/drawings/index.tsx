import { Link, createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CopyIcon, Share2Icon, PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { useDrawings } from '@/querys/useDrawings'

export const Route = createFileRoute('/drawings/')({
  component: DrawingsList,
})

function DrawingsList() {
  const session = authClient.useSession()

  const { data: drawings, isLoading } = useDrawings(!!session.data)

  // navigator.userAgent.includes

  if (!session.data) {
    return (
      <div className="min-h-screen dark:bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center">
              Please log in to view your drawings.{' '}
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">My Drawings</h1>
          <Link to="/drawings/create">
            <Button variant="default">
              <PlusIcon className="w-4 h-4" />
              new
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
                className="p-4 dark:bg-slate-900/50 border-slate-700 hover:border-cyan-500 transition-colors"
              >
                <div className="flex flex-col justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold line-clamp-2 dark:text-white mb-2">
                      {drawing.title}
                    </h2>
                    <p className="text-md text-text-light-secondary dark:text-text-dark-secondary mb-2">
                      Selection:{' '}
                      {drawing.winnerSelection === 'random'
                        ? 'Random'
                        : 'By Number'}
                    </p>
                    {drawing.winnerSelection === 'number' && (
                      <p className="text-md text-text-light-secondary dark:text-text-dark-secondary mb-2">
                        Numbers: {drawing.quantityOfNumbers}
                      </p>
                    )}
                    <p className="text-md text-text-light-secondary dark:text-text-dark-secondary mb-2">
                      Type:{' '}
                      {drawing.isPaid
                        ? `Paid ($${(drawing.price / 100).toFixed(2)})`
                        : 'Free'}
                    </p>
                    <p className="text-md text-text-light-secondary dark:text-text-dark-secondary">
                      End Date: {new Date(drawing.endAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 self-end mt-2">
                    <Link
                      to={`/drawings/$drawingId`}
                      params={{ drawingId: drawing.id }}
                    >
                      <Button variant="outline">View</Button>
                    </Link>
                    <Button
                      onClick={() => {
                        // toast.success('Lol!')
                        const url = `${window.location.origin}/slot/${drawing.id}`
                        navigator.clipboard.writeText(url).then(() => {
                          toast.success('Link copied to clipboard!')
                        })
                      }}
                      variant="outline"
                      size="icon"
                    >
                      <CopyIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        const url = `${window.location.origin}/slot/${drawing.id}`
                        navigator
                          .share({
                            title: 'Join my drawing!',
                            text: drawing.title,
                            url: url,
                          })
                          .catch(() => {
                            // Handle share failure or cancellation
                            console.log('Share failed or was cancelled')
                          })
                      }}
                      variant="outline"
                      size="icon"
                    >
                      <Share2Icon className="w-4 h-4" />
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
              <Link
                to="/drawings/create"
                className="text-cyan-400 hover:text-cyan-300"
              >
                Create your first drawing
              </Link>
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
