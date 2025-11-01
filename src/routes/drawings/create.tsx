import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/drawings/create')({
  component: CreateDrawing,
})

function CreateDrawing() {
  const navigate = useNavigate()
  const session = authClient.useSession()
  const [formData, setFormData] = useState({
    title: '',
    guidelines: [''],
    isPaid: false,
    price: 0,
    winnerSelection: 'random' as 'random' | 'number',
    quantityOfNumbers: 100,
    isWinnerNumberRandom: true,
    endAt: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGuidelineChange = (index: number, value: string) => {
    const newGuidelines = [...formData.guidelines]
    newGuidelines[index] = value
    setFormData({ ...formData, guidelines: newGuidelines })
  }

  const addGuideline = () => {
    setFormData({ ...formData, guidelines: [...formData.guidelines, ''] })
  }

  const removeGuideline = (index: number) => {
    const newGuidelines = formData.guidelines.filter((_, i) => i !== index)
    setFormData({ ...formData, guidelines: newGuidelines })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Filter out empty guidelines
      const filteredGuidelines = formData.guidelines.filter((g) => g.trim())

      const response = await fetch('/api/drawings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          guidelines: filteredGuidelines,
          price: formData.isPaid ? formData.price * 100 : 0, // Convert to cents
        }),
      })

      if (response.ok) {
        const data = await response.json()
        navigate({ to: '/drawings' })
      } else {
        console.error('Failed to create drawing')
      }
    } catch (error) {
      console.error('Error creating drawing:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session.data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <p className="text-white text-center">
              Please log in to create a drawing.{' '}
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
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-6">Create New Drawing</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-white">
                Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="bg-slate-700 text-white border-slate-600"
              />
            </div>

            <div>
              <Label className="text-white">Guidelines (Optional)</Label>
              {formData.guidelines.map((guideline, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={guideline}
                    onChange={(e) => handleGuidelineChange(index, e.target.value)}
                    placeholder={`Guideline ${index + 1}`}
                    className="bg-slate-700 text-white border-slate-600"
                  />
                  {formData.guidelines.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeGuideline(index)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                onClick={addGuideline}
                className="bg-slate-600 hover:bg-slate-700 text-white mt-2"
              >
                Add Guideline
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPaid"
                checked={formData.isPaid}
                onChange={(e) =>
                  setFormData({ ...formData, isPaid: e.target.checked })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="isPaid" className="text-white">
                Paid Event
              </Label>
            </div>

            {formData.isPaid && (
              <div>
                <Label htmlFor="price" className="text-white">
                  Price (in dollars)
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) })
                  }
                  required={formData.isPaid}
                  className="bg-slate-700 text-white border-slate-600"
                />
              </div>
            )}

            <div>
              <Label htmlFor="winnerSelection" className="text-white">
                Winner Selection Method
              </Label>
              <select
                id="winnerSelection"
                value={formData.winnerSelection}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    winnerSelection: e.target.value as 'random' | 'number',
                  })
                }
                className="w-full p-2 bg-slate-700 text-white border border-slate-600 rounded"
                required
              >
                <option value="random">Random Selection</option>
                <option value="number">Number Selection</option>
              </select>
            </div>

            {formData.winnerSelection === 'number' && (
              <>
                <div>
                  <Label htmlFor="quantityOfNumbers" className="text-white">
                    Quantity of Numbers
                  </Label>
                  <select
                    id="quantityOfNumbers"
                    value={formData.quantityOfNumbers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantityOfNumbers: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-2 bg-slate-700 text-white border border-slate-600 rounded"
                    required
                  >
                    <option value="100">100</option>
                    <option value="500">500</option>
                    <option value="1000">1000</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isWinnerNumberRandom"
                    checked={formData.isWinnerNumberRandom}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isWinnerNumberRandom: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isWinnerNumberRandom" className="text-white">
                    Random Winner Number (system generated)
                  </Label>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="endAt" className="text-white">
                End Date & Time
              </Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={formData.endAt}
                onChange={(e) =>
                  setFormData({ ...formData, endAt: e.target.value })
                }
                required
                className="bg-slate-700 text-white border-slate-600"
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isSubmitting ? 'Creating...' : 'Create Drawing'}
              </Button>
              <Button
                type="button"
                onClick={() => navigate({ to: '/drawings' })}
                className="bg-slate-600 hover:bg-slate-700 text-white"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
