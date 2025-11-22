import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useDrawing } from '@/querys/useDrawing'
import { usePublicParticipants } from '@/querys/useParticipants'

export const Route = createFileRoute('/join/$drawingId')({
  component: JoinDrawing,
})

function JoinDrawing() {
  const { drawingId } = Route.useParams()
  const navigate = useNavigate()
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: drawing, isLoading: drawingLoading } = useDrawing(drawingId)

  const { data: participants } = usePublicParticipants(
    drawingId,
    !!drawing && drawing.winnerSelection === 'number',
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/drawings/${drawingId}/participate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          selectedNumber:
            drawing.winnerSelection === 'number' ? selectedNumber : undefined,
        }),
      })

      if (response.ok) {
        alert('Successfully registered for the drawing!')
        navigate({ to: '/' })
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to register')
      }
    } catch (error) {
      console.error('Error registering:', error)
      alert('An error occurred while registering')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (drawingLoading) {
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

  // Get taken numbers
  const takenNumbers = new Set(
    participants
      ?.filter((p: any) => p.selectedNumber !== null && p.isEligible !== false)
      .map((p: any) => p.selectedNumber) || [],
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="p-6 bg-slate-800/50 border-slate-700 mb-6">
          <h1 className="text-3xl font-bold text-white mb-4">
            {drawing.title}
          </h1>

          <div className="text-white space-y-2">
            <p className="text-gray-400">
              <strong>Type:</strong>{' '}
              {drawing.isPaid
                ? `Paid - $${(drawing.price / 100).toFixed(2)}`
                : 'Free'}
            </p>
            <p className="text-gray-400">
              <strong>Selection Method:</strong>{' '}
              {drawing.winnerSelection === 'random' ? 'Random' : 'By Number'}
            </p>
            <p className="text-gray-400">
              <strong>End Date:</strong>{' '}
              {new Date(drawing.endAt).toLocaleString()}
            </p>

            {drawing.guidelines && drawing.guidelines.length > 0 && (
              <div className="mt-4">
                <strong className="text-white">Guidelines:</strong>
                <ul className="list-disc list-inside text-gray-400 mt-2">
                  {drawing.guidelines.map(
                    (guideline: string, index: number) => (
                      <li key={index}>{guideline}</li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        </Card>

        {drawing.winnerSelection === 'number' && (
          <Card className="p-6 bg-slate-800/50 border-slate-700 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              Select Your Number
            </h2>
            <p className="text-gray-400 mb-4">
              Available: {drawing.quantityOfNumbers - takenNumbers.size} /{' '}
              {drawing.quantityOfNumbers}
            </p>

            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-12 gap-2 max-h-96 overflow-y-auto">
              {Array.from(
                { length: drawing.quantityOfNumbers },
                (_, i) => i + 1,
              ).map((number) => {
                const isTaken = takenNumbers.has(number)
                const isSelected = selectedNumber === number
                return (
                  <button
                    key={number}
                    onClick={() => !isTaken && setSelectedNumber(number)}
                    disabled={isTaken}
                    className={`
                        p-3 rounded text-sm font-medium transition-colors
                        ${isTaken ? 'bg-red-900/50 text-gray-500 cursor-not-allowed' : ''}
                        ${isSelected ? 'bg-cyan-600 text-white' : ''}
                        ${!isTaken && !isSelected ? 'bg-slate-700 text-white hover:bg-slate-600' : ''}
                      `}
                  >
                    {number}
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            {drawing.winnerSelection === 'number'
              ? 'Confirm Your Registration'
              : 'Register for Drawing'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">
                Full Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="bg-slate-700 text-white border-slate-600"
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
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="bg-slate-700 text-white border-slate-600"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-white">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                className="bg-slate-700 text-white border-slate-600"
              />
            </div>

            {drawing.winnerSelection === 'number' && selectedNumber && (
              <div className="p-4 bg-cyan-900/30 rounded border border-cyan-700">
                <p className="text-white font-medium">
                  Selected Number:{' '}
                  <span className="text-cyan-400 text-xl">
                    {selectedNumber}
                  </span>
                </p>
              </div>
            )}

            {drawing.isPaid && (
              <div className="p-4 bg-yellow-900/30 rounded border border-yellow-700">
                <p className="text-yellow-200">
                  <strong>Payment Required:</strong> This is a paid event. After
                  registration, you will need to complete the payment and upload
                  proof.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (drawing.winnerSelection === 'number' && !selectedNumber)
              }
              className="bg-cyan-600 hover:bg-cyan-700 text-white w-full"
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
