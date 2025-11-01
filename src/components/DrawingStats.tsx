/**
 * DrawingStats Component
 * 
 * Displays aggregated statistics about number slot availability
 * Shows visual progress and key metrics at a glance
 */

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface DrawingStatsProps {
  drawingId: string
  className?: string
}

interface StatsData {
  total: number
  available: number
  taken: number
  reserved: number
  percentageTaken: number
}

export function DrawingStats({ drawingId, className }: DrawingStatsProps) {
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ['drawing-stats', drawingId],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/${drawingId}/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-lg border bg-card p-6 animate-pulse',
          className
        )}
      >
        <div className="h-4 bg-muted rounded w-32 mb-4" />
        <div className="h-8 bg-muted rounded w-full mb-2" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const stats = [
    {
      label: 'Available',
      value: data.available,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      label: 'Taken',
      value: data.taken,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
    },
    {
      label: 'Reserved',
      value: data.reserved,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
  ]

  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)}>
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted-foreground">
            {data.taken} / {data.total} ({data.percentageTaken.toFixed(1)}%)
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
            style={{ width: `${data.percentageTaken}%` }}
          />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'rounded-lg p-3 text-center space-y-1',
              stat.bgColor
            )}
          >
            <div className={cn('text-2xl font-bold', stat.color)}>
              {stat.value}
            </div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Total count */}
      <div className="pt-2 border-t text-center">
        <div className="text-sm text-muted-foreground">
          Total Numbers: <span className="font-semibold">{data.total}</span>
        </div>
      </div>
    </div>
  )
}
