/**
 * NumberCell Component
 * 
 * Displays a single number slot with its status (available, reserved, or taken)
 * Provides visual feedback and allows selection when available
 */

import { cn } from '@/lib/utils'

export interface NumberSlotStatus {
  status: 'available' | 'reserved' | 'taken'
  participantName?: string
  expiresAt?: string
}

interface NumberCellProps {
  number: number
  slot?: NumberSlotStatus
  isLoading?: boolean
  onSelect?: () => void
  isSelectable?: boolean
  className?: string
}

export function NumberCell({
  number,
  slot,
  isLoading = false,
  onSelect,
  isSelectable = true,
  className,
}: NumberCellProps) {
  const status = slot?.status || 'available'
  const isAvailable = status === 'available'
  const canSelect = isSelectable && isAvailable && !isLoading

  // Status-specific styling
  const statusStyles = {
    available:
      'bg-green-100 hover:bg-green-200 border-green-300 text-green-900 dark:bg-green-900/20 dark:border-green-700 dark:text-green-100',
    reserved:
      'bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-100 cursor-not-allowed',
    taken:
      'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-100 cursor-not-allowed',
  }

  // Tooltip text based on status
  const getTooltipText = () => {
    if (slot?.participantName) {
      return `Taken by ${slot.participantName}`
    }
    if (status === 'reserved') {
      const expiresText = slot?.expiresAt
        ? ` (expires ${new Date(slot.expiresAt).toLocaleTimeString()})`
        : ''
      return `Reserved${expiresText}`
    }
    return 'Available'
  }

  return (
    <button
      type="button"
      onClick={canSelect ? onSelect : undefined}
      disabled={!canSelect}
      className={cn(
        'relative aspect-square flex items-center justify-center',
        'rounded-lg border-2 font-semibold text-sm md:text-base',
        'transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-60',
        canSelect &&
          'hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer',
        isLoading && 'animate-pulse',
        statusStyles[status],
        className
      )}
      title={getTooltipText()}
      aria-label={`Number ${number} - ${status}`}
      aria-pressed={!isAvailable}
    >
      <span className="relative z-10">{number}</span>

      {/* Visual indicator for selected/taken */}
      {status === 'taken' && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-full h-full opacity-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </span>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50">
          <svg
            className="animate-spin h-5 w-5 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
    </button>
  )
}
