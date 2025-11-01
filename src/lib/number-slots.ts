/**
 * Number Slots Manager
 * 
 * Handles efficient management and querying of number slots for drawings.
 * Provides utilities for initialization, reservation, and status tracking.
 */

import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import type {NumberSlot, Participant} from '@/db/schema';
import { db } from '@/db'
import {   numberSlots, participants } from '@/db/schema'

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface NumberSlotInfo {
  number: number
  status: 'available' | 'reserved' | 'taken'
  participantId?: number
  participantName?: string
  expiresAt?: Date
}

export interface NumberSlotsQuery {
  drawingId: string
  page?: number
  pageSize?: number
  status?: 'available' | 'reserved' | 'taken'
  numbers?: Array<number> // Specific numbers to query
}

export interface NumberSlotsResult {
  slots: Array<NumberSlotInfo>
  totalCount: number
  availableCount: number
  takenCount: number
  reservedCount: number
  hasMore: boolean
  nextPage?: number
}

export interface DrawingStats {
  total: number
  available: number
  taken: number
  reserved: number
  percentageTaken: number
}

export interface ReservationResult {
  success: boolean
  message?: string
  expiresAt?: Date
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Initialize number slots for a new drawing
 * Creates all number slot records in bulk for optimal performance
 * 
 * @param drawingId - The unique identifier of the drawing
 * @param quantity - The total number of slots to create
 * @throws Error if slots already exist for this drawing
 * 
 * @example
 * await initializeNumberSlots('drawing-123', 300)
 */
export async function initializeNumberSlots(
  drawingId: string,
  quantity: number
): Promise<void> {
  if (quantity <= 0 || quantity > 10000) {
    throw new Error('Quantity must be between 1 and 10000')
  }

  // Check if slots already exist
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(numberSlots)
    .where(eq(numberSlots.drawingId, drawingId))

  if (existing[0]?.count > 0) {
    throw new Error('Number slots already initialized for this drawing')
  }

  // Create slots in batches for better performance
  const BATCH_SIZE = 1000
  const batches = Math.ceil(quantity / BATCH_SIZE)

  for (let batch = 0; batch < batches; batch++) {
    const start = batch * BATCH_SIZE
    const end = Math.min(start + BATCH_SIZE, quantity)
    
    const slots = Array.from({ length: end - start }, (_, i) => ({
      drawingId,
      number: start + i + 1,
      status: 'available' as const,
    }))

    await db.insert(numberSlots).values(slots)
  }
}

/**
 * Get number slots with pagination and filtering
 * Returns minimal data for efficient rendering
 * 
 * @param query - Query parameters for filtering and pagination
 * @returns Paginated result with slot information and metadata
 * 
 * @example
 * const result = await getNumberSlots({
 *   drawingId: 'drawing-123',
 *   page: 1,
 *   pageSize: 100,
 *   status: 'available'
 * })
 */
export async function getNumberSlots(
  query: NumberSlotsQuery
): Promise<NumberSlotsResult> {
  const { drawingId, page = 1, pageSize = 100, status, numbers } = query

  if (pageSize > 1000) {
    throw new Error('Page size cannot exceed 1000')
  }

  // Build the base query
  let baseQuery = db
    .select({
      number: numberSlots.number,
      status: numberSlots.status,
      participantId: numberSlots.participantId,
      participantName: participants.name,
      expiresAt: numberSlots.expiresAt,
    })
    .from(numberSlots)
    .leftJoin(participants, eq(numberSlots.participantId, participants.id))
    .$dynamic()

  // Apply filters
  const conditions = [eq(numberSlots.drawingId, drawingId)]

  if (status) {
    conditions.push(eq(numberSlots.status, status))
  }

  if (numbers && numbers.length > 0) {
    conditions.push(inArray(numberSlots.number, numbers))
  }

  baseQuery = baseQuery.where(and(...conditions))

  // Get paginated results (fetch one extra to check if there are more)
  const slotsPromise = baseQuery
    .orderBy(numberSlots.number)
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize)

  // Get status counts for metadata
  const countsPromise = db
    .select({
      status: numberSlots.status,
      count: sql<number>`count(*)::int`,
    })
    .from(numberSlots)
    .where(eq(numberSlots.drawingId, drawingId))
    .groupBy(numberSlots.status)

  // Execute queries in parallel
  const [slots, counts] = await Promise.all([slotsPromise, countsPromise])

  // Check if there are more results
  const hasMore = slots.length > pageSize
  const resultSlots = hasMore ? slots.slice(0, pageSize) : slots

  // Calculate status counts
  const statusCounts = counts.reduce(
    (acc, { status: slotStatus, count }) => {
      acc[slotStatus] = count
      return acc
    },
    {} as Record<string, number>
  )

  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  return {
    slots: resultSlots.map((slot) => ({
      number: slot.number,
      status: slot.status as 'available' | 'reserved' | 'taken',
      participantId: slot.participantId ?? undefined,
      participantName: slot.participantName ?? undefined,
      expiresAt: slot.expiresAt ?? undefined,
    })),
    totalCount,
    availableCount: statusCounts['available'] || 0,
    takenCount: statusCounts['taken'] || 0,
    reservedCount: statusCounts['reserved'] || 0,
    hasMore,
    nextPage: hasMore ? page + 1 : undefined,
  }
}

/**
 * Reserve a number temporarily (e.g., during payment processing)
 * Prevents other users from selecting the same number
 * 
 * @param drawingId - The drawing identifier
 * @param number - The number to reserve
 * @param expirationMinutes - How long to hold the reservation (default: 15 minutes)
 * @returns Success status and optional message
 * 
 * @example
 * const result = await reserveNumber('drawing-123', 42, 15)
 * if (result.success) {
 *   console.log('Reserved until:', result.expiresAt)
 * }
 */
export async function reserveNumber(
  drawingId: string,
  number: number,
  expirationMinutes: number = 15
): Promise<ReservationResult> {
  if (expirationMinutes <= 0 || expirationMinutes > 60) {
    return { success: false, message: 'Expiration must be between 1 and 60 minutes' }
  }

  // Check if the number is available
  const slot = await db
    .select()
    .from(numberSlots)
    .where(
      and(
        eq(numberSlots.drawingId, drawingId),
        eq(numberSlots.number, number)
      )
    )
    .limit(1)

  if (!slot.length) {
    return { success: false, message: 'Number does not exist' }
  }

  if (slot[0].status !== 'available') {
    return { success: false, message: 'Number is not available' }
  }

  // Calculate expiration time
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000)

  // Update the slot to reserved
  try {
    await db
      .update(numberSlots)
      .set({
        status: 'reserved',
        reservedAt: new Date(),
        expiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(numberSlots.drawingId, drawingId),
          eq(numberSlots.number, number),
          eq(numberSlots.status, 'available') // Double-check it's still available
        )
      )

    return { success: true, expiresAt }
  } catch (error) {
    console.error('Failed to reserve number:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to reserve number',
    }
  }
}

/**
 * Confirm a number reservation and assign it to a participant
 * Should be called after payment verification or eligibility check
 * 
 * @param drawingId - The drawing identifier
 * @param number - The number to confirm
 * @param participantId - The participant who gets the number
 * @throws Error if reservation doesn't exist or has expired
 * 
 * @example
 * await confirmNumberReservation('drawing-123', 42, participantId)
 */
export async function confirmNumberReservation(
  drawingId: string,
  number: number,
  participantId: number
): Promise<void> {
  const result = await db
    .update(numberSlots)
    .set({
      status: 'taken',
      participantId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(numberSlots.drawingId, drawingId),
        eq(numberSlots.number, number),
        eq(numberSlots.status, 'reserved')
      )
    )

  // Check if any rows were affected
  const rowsAffected = result.rowCount ?? 0
  if (rowsAffected === 0) {
    throw new Error('Reservation not found or already expired')
  }
}

/**
 * Release a specific reservation back to available status
 * Useful when a user cancels their selection
 * 
 * @param drawingId - The drawing identifier
 * @param number - The number to release
 * @returns True if reservation was released, false if not found
 * 
 * @example
 * const released = await releaseReservation('drawing-123', 42)
 */
export async function releaseReservation(
  drawingId: string,
  number: number
): Promise<boolean> {
  const result = await db
    .update(numberSlots)
    .set({
      status: 'available',
      reservedAt: null,
      expiresAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(numberSlots.drawingId, drawingId),
        eq(numberSlots.number, number),
        eq(numberSlots.status, 'reserved')
      )
    )

  return (result.rowCount || 0) > 0
}

/**
 * Release all expired reservations across all drawings
 * Should be run periodically (e.g., every minute via cron job)
 * 
 * @returns Number of reservations released
 * 
 * @example
 * const count = await releaseExpiredReservations()
 * console.log(`Released ${count} expired reservations`)
 */
export async function releaseExpiredReservations(): Promise<number> {
  const result = await db
    .update(numberSlots)
    .set({
      status: 'available',
      reservedAt: null,
      expiresAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(numberSlots.status, 'reserved'),
        lt(numberSlots.expiresAt, new Date())
      )
    )

  return result.rowCount || 0
}

/**
 * Get aggregated statistics for a drawing
 * Useful for displaying progress and availability
 * 
 * @param drawingId - The drawing identifier
 * @returns Statistics about slot distribution
 * 
 * @example
 * const stats = await getDrawingStats('drawing-123')
 * console.log(`${stats.percentageTaken}% sold`)
 */
export async function getDrawingStats(
  drawingId: string
): Promise<DrawingStats> {
  const counts = await db
    .select({
      status: numberSlots.status,
      count: sql<number>`count(*)::int`,
    })
    .from(numberSlots)
    .where(eq(numberSlots.drawingId, drawingId))
    .groupBy(numberSlots.status)

  const stats = counts.reduce((acc, { status, count }) => {
    acc[status] = count
    return acc
  }, {} as Record<string, number>)

  const total = Object.values(stats).reduce((a, b) => a + b, 0)
  const taken = stats['taken'] || 0

  return {
    total,
    available: stats['available'] || 0,
    taken,
    reserved: stats['reserved'] || 0,
    percentageTaken: total > 0 ? Math.round((taken / total) * 10000) / 100 : 0,
  }
}

/**
 * Get a random available number from a drawing
 * Useful for quick-pick functionality
 * 
 * @param drawingId - The drawing identifier
 * @returns A random available number or null if none available
 * 
 * @example
 * const luckyNumber = await getRandomAvailableNumber('drawing-123')
 */
export async function getRandomAvailableNumber(
  drawingId: string
): Promise<number | null> {
  const available = await db
    .select({ number: numberSlots.number })
    .from(numberSlots)
    .where(
      and(
        eq(numberSlots.drawingId, drawingId),
        eq(numberSlots.status, 'available')
      )
    )
    .orderBy(sql`RANDOM()`)
    .limit(1)

  return available.length > 0 ? available[0].number : null
}

/**
 * Check if a specific number is available
 * Fast lookup for single number availability
 * 
 * @param drawingId - The drawing identifier
 * @param number - The number to check
 * @returns True if available, false otherwise
 * 
 * @example
 * if (await isNumberAvailable('drawing-123', 42)) {
 *   // Allow user to select
 * }
 */
export async function isNumberAvailable(
  drawingId: string,
  number: number
): Promise<boolean> {
  const slot = await db
    .select({ status: numberSlots.status })
    .from(numberSlots)
    .where(
      and(
        eq(numberSlots.drawingId, drawingId),
        eq(numberSlots.number, number)
      )
    )
    .limit(1)

  return slot.length > 0 && slot[0].status === 'available'
}

/**
 * Get all numbers assigned to a specific participant
 * Supports multiple number selection if enabled
 * 
 * @param drawingId - The drawing identifier
 * @param participantId - The participant identifier
 * @returns Array of numbers owned by the participant
 * 
 * @example
 * const myNumbers = await getParticipantNumbers('drawing-123', participantId)
 */
export async function getParticipantNumbers(
  drawingId: string,
  participantId: number
): Promise<Array<number>> {
  const slots = await db
    .select({ number: numberSlots.number })
    .from(numberSlots)
    .where(
      and(
        eq(numberSlots.drawingId, drawingId),
        eq(numberSlots.participantId, participantId)
      )
    )
    .orderBy(numberSlots.number)

  return slots.map((slot) => slot.number)
}

/**
 * Bulk reserve multiple numbers at once
 * Useful for allowing users to select multiple numbers
 * 
 * @param drawingId - The drawing identifier
 * @param numbers - Array of numbers to reserve
 * @param expirationMinutes - How long to hold the reservations
 * @returns Object with successful and failed reservations
 * 
 * @example
 * const result = await bulkReserveNumbers('drawing-123', [1, 5, 10], 15)
 * console.log(`Reserved: ${result.successful.length}, Failed: ${result.failed.length}`)
 */
export async function bulkReserveNumbers(
  drawingId: string,
  numbers: Array<number>,
  expirationMinutes: number = 15
): Promise<{ successful: Array<number>; failed: Array<number> }> {
  const results = await Promise.allSettled(
    numbers.map((number) => reserveNumber(drawingId, number, expirationMinutes))
  )

  const successful: Array<number> = []
  const failed: Array<number> = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successful.push(numbers[index])
    } else {
      failed.push(numbers[index])
    }
  })

  return { successful, failed }
}
