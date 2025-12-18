import { useState } from 'react'
import { Drawing } from '@/db/schema'
import { Clock, HandCoins } from 'lucide-react'
import { cn, getTimeRemainingText } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface DrawingSlotHeaderProps {
  drawing: Drawing
  stats?: {
    available: number
    total: number
  }
  hasEnded?: boolean
}

function DrawingSlotHeader({
  drawing,
  stats,
  hasEnded,
}: DrawingSlotHeaderProps) {
  const [isTitleExpanded, setIsTitleExpanded] = useState(false)
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex flex-col gap-2 justify-center">
        {/* Title */}
        <section>
          <h1
            className={cn(
              'text-xl md:text-2xl font-bold dark:text-white',
              !isTitleExpanded && drawing.title.length > 158
                ? 'line-clamp-2'
                : '',
            )}
          >
            {drawing.title}
          </h1>
          {drawing.title.length > 158 && (
            <button
              onClick={() => setIsTitleExpanded(!isTitleExpanded)}
              className="text-cyan-600 dark:text-cyan-400 text-sm hover:underline self-start"
            >
              {isTitleExpanded ? t('drawing.header.less') : t('drawing.header.more')}
            </button>
          )}
        </section>
        <div className="flex items-center justify-between gap-6 ">
          {/* Prize Badge */}
          <div className="flex items-center gap-2 px-2 py-1 md:px-4 border-2 border-teal-500 rounded-lg bg-teal-50 dark:bg-teal-950">
            <HandCoins className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
              {drawing.isPaid
                ? `$${(drawing.price ?? 0).toLocaleString()}`
                : t('drawing.header.free')}
            </span>
          </div>

          {/* Time Remaining Badge */}
          <div className="flex items-center gap-2 px-2 py-1 md:px-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
              {drawing.endAt && getTimeRemainingText(drawing.endAt)}
            </span>
          </div>
        </div>
        {/* Available Slots - only show when drawing hasn't ended */}
        {stats && !hasEnded && (
          <div className="text-center mb-2">
            <div className="text-xl md:text-4xl font-bold text-teal-600 dark:text-teal-400">
              {stats.available} / {stats.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('drawing.header.available')}
            </div>
          </div>
        )}
      </div>
      <div className="border-b border-gray-300 border-dashed mt-3 mb-4.5 dark:border-gray-700" />
    </div>
  )
}

export default DrawingSlotHeader
