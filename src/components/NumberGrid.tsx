/**
 * NumberGrid Component
 *
 * Efficiently renders large grids of number slots using virtual scrolling
 * Adapts column count based on screen size for responsive layouts
 */

import { useEffect, useRef, useState } from 'react'
import { NumberCell } from './NumberCell'
import type { NumberSlotStatus } from './NumberCell'
import { cn } from '@/lib/utils'
import { useNumberSlots } from '@/querys/useNumberSlots'

interface NumberGridProps {
  drawingId: string
  totalNumbers: number
  onNumberSelect?: (number: number) => void
  isSelectable?: boolean
  className?: string
}

export function NumberGrid({
  drawingId,
  totalNumbers,
  onNumberSelect,
  isSelectable = true,
  className,
}: NumberGridProps) {
  const [visibleRange, setVisibleRange] = useState({ start: 1, end: 100 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate responsive column count
  const getColumnsCount = () => {
    if (typeof window === 'undefined') return 10
    const width = window.innerWidth
    if (width < 640) return 5 // mobile
    if (width < 768) return 8 // tablet
    if (width < 1024) return 10 // small desktop
    return 15 // large desktop
  }

  const [columns, setColumns] = useState(getColumnsCount())

  // Update columns on window resize
  useEffect(() => {
    const handleResize = () => {
      setColumns(getColumnsCount())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch slots for visible range
  const numbers = Array.from(
    { length: visibleRange.end - visibleRange.start + 1 },
    (_, i) => visibleRange.start + i,
  )
  const { data, isLoading } = useNumberSlots(drawingId, numbers, true, {
    queryKey: ['number-slots', drawingId, visibleRange.start, visibleRange.end],
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  // Handle scroll to load more numbers
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const scrollPercentage =
      (element.scrollTop + element.clientHeight) / element.scrollHeight

    // Load more when scrolled 80%
    if (scrollPercentage > 0.8 && visibleRange.end < totalNumbers) {
      const newEnd = Math.min(visibleRange.end + 100, totalNumbers)
      setVisibleRange((prev) => ({ ...prev, end: newEnd }))
    }
  }

  // Create a map of slot data by number
  const slotsByNumber = new Map<number, NumberSlotStatus>(
    data?.slots.map((slot) => [
      slot.number,
      {
        status: slot.status,
        participantName: slot.participantName,
        expiresAt: slot.expiresAt,
      },
    ]) || [],
  )

  // Generate grid numbers
  const gridNumbers = Array.from(
    { length: Math.min(visibleRange.end, totalNumbers) },
    (_, i) => i + 1,
  )

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        'overflow-auto rounded-lg border bg-card p-4',
        'max-h-[600px] md:max-h-[700px]',
        className,
      )}
    >
      <div
        className="grid gap-2 md:gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {gridNumbers.map((number) => (
          <NumberCell
            key={number}
            number={number}
            slot={slotsByNumber.get(number)}
            isLoading={isLoading && !slotsByNumber.has(number)}
            onSelect={() => onNumberSelect?.(number)}
            isSelectable={isSelectable}
          />
        ))}
      </div>

      {/* Loading indicator for more numbers */}
      {visibleRange.end < totalNumbers && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Scroll down to see more numbers...
        </div>
      )}

      {/* Reached end indicator */}
      {visibleRange.end >= totalNumbers && totalNumbers > 100 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          All {totalNumbers} numbers loaded
        </div>
      )}
    </div>
  )
}
