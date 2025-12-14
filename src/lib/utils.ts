import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export type FormatNumberOptions = {
  /**
   * BCP 47 locale string (e.g. 'en-US').
   * If omitted, the runtime's default locale is used.
   */
  locale?: string
  /**
   * Whether to use grouping separators (e.g. 10,000). Defaults to true.
   */
  useGrouping?: boolean
  /**
   * For number inputs, controls decimal rounding.
   * (Ignored for string inputs; string decimals are preserved as-is.)
   */
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

/**
 * Formats a numeric value with thousands separators (no currency).
 *
 * - `number`/`bigint`: uses `Intl.NumberFormat` (supports locales)
 * - `string`: preserves the provided decimals and only adds grouping to the integer part
 */
export function formatNumber(
  value: number | bigint | string | null | undefined,
  options: FormatNumberOptions = {},
): string {
  if (value === null || value === undefined) return ''

  const { locale, useGrouping = true } = options

  if (typeof value === 'bigint') {
    return new Intl.NumberFormat(locale, { useGrouping }).format(value)
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return ''
    const { minimumFractionDigits, maximumFractionDigits } = options
    return new Intl.NumberFormat(locale, {
      useGrouping,
      ...(minimumFractionDigits !== undefined ? { minimumFractionDigits } : {}),
      ...(maximumFractionDigits !== undefined ? { maximumFractionDigits } : {}),
    }).format(value)
  }

  const raw = value.trim()
  if (!raw) return ''

  // If it's not a simple numeric string, return it unchanged.
  // (Prevents mangling things like '12,345' or '1e6'.)
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return raw

  // Get locale-specific separators
  const parts = new Intl.NumberFormat(locale, {
    useGrouping: true,
  }).formatToParts(12345.6)
  const group = parts.find((p) => p.type === 'group')?.value ?? ','
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.'

  const negative = raw.startsWith('-')
  const unsigned = negative ? raw.slice(1) : raw
  const [intPart, fracPart] = unsigned.split('.')

  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, group)
  const grouped =
    fracPart !== undefined ? `${groupedInt}${decimal}${fracPart}` : groupedInt
  return negative ? `-${grouped}` : grouped
}

export const getTimeRemainingText = (endDate: string) => {
  const isFullIsoWithTimezone =
    /Z$/.test(endDate) || /[+-]\d{2}:?\d{2}$/.test(endDate)

  // If we get a "datetime-local" style string (no timezone), treat it as UTC wall time.
  const end = isFullIsoWithTimezone
    ? new Date(endDate)
    : new Date(datetimeLocalToUtcISOString(endDate))
  const now = new Date()
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}d ${hours}H`
  }
  return `${hours}H`
}

export const formatDateGiway = (dateString: string) => {
  const date = new Date(dateString)

  const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone

  const formatter = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: userTZ,
      ...opts,
    }).format(date)

  const todayLocal = new Date().toLocaleDateString(navigator.language, {
    timeZone: userTZ,
  })
  const dateLocal = date.toLocaleDateString(navigator.language, {
    timeZone: userTZ,
  })

  if (dateLocal === todayLocal) {
    return `Today ${formatter({ hour: '2-digit', minute: '2-digit', hour12: true })}`
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayLocal = yesterday.toLocaleDateString(navigator.language, {
    timeZone: userTZ,
  })

  if (dateLocal === yesterdayLocal) {
    return `Yesterday ${formatter({ hour: '2-digit', minute: '2-digit', hour12: true })}`
  }

  return `${formatter({ month: 'short', day: '2-digit' })} ${formatter({ hour: '2-digit', minute: '2-digit', hour12: true })}`
}

export function datetimeLocalToUtcISOString(value: string) {
  // `value` format: YYYY-MM-DDTHH:mm (no timezone)
  // Treat it as a *local* wall time and serialize to a UTC ISO string (Z).
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return value

  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return value
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString()
}
