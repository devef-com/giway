/**
 * Winner Selection Logic
 *
 * Core implementation for selecting winners in drawings.
 * Supports both random participant selection and number-based selection.
 */

import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db/index'
import {
  drawings,
  participants,
  numberSlots,
  drawingWinners,
} from '@/db/schema'
import {
  shuffleArray,
  generateUniqueRandomNumbers,
  validateDrawingEnded,
  validateWinnerSelection,
} from './utils'

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WinnerSelectionResult {
  drawingId: string
  winners: Array<{
    participantId: number
    participantName: string
    winningNumber?: number
  }>
  winnerNumbers?: number[]
  selectionMethod: 'random' | 'number'
  timestamp: Date
}

export interface SelectRandomWinnersParams {
  drawingId: string
  winnersAmount: number
}

export interface SelectNumberWinnersParams {
  drawingId: string
  winnersAmount: number
  quantityOfNumbers: number
  winnerSelectionIsManually: boolean
  existingWinnerNumbers?: number[] | null
}

// ============================================================================
// Random Winner Selection
// ============================================================================

/**
 * Select winners randomly from eligible participants
 * Used when drawing.winnerSelection = 'random'
 *
 * Process:
 * 1. Fetch all eligible participants (isEligible = true)
 * 2. Randomly shuffle participants
 * 3. Select first N participants where N = winnersAmount
 * 4. Insert into drawingWinners table
 *
 * @param params - Random winner selection parameters
 * @returns Array of selected winners with participant info
 */
export async function selectRandomWinners(
  params: SelectRandomWinnersParams,
): Promise<WinnerSelectionResult['winners']> {
  const { drawingId, winnersAmount } = params

  // Fetch all eligible participants
  const eligibleParticipants = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.drawingId, drawingId),
        eq(participants.isEligible, true),
      ),
    )

  // Validate we have enough participants
  validateWinnerSelection(winnersAmount, eligibleParticipants.length)

  // Randomly shuffle and select winners
  const shuffled = shuffleArray(eligibleParticipants)
  const selectedWinners = shuffled.slice(0, winnersAmount)

  // Insert into drawingWinners table
  const winnersData = selectedWinners.map(
    (participant: (typeof eligibleParticipants)[0]) => ({
      drawingId,
      participantId: participant.id,
    }),
  )

  await db.insert(drawingWinners).values(winnersData)

  // Return winner information
  return selectedWinners.map(
    (participant: (typeof eligibleParticipants)[0]) => ({
      participantId: participant.id,
      participantName: participant.name,
    }),
  )
}

// ============================================================================
// Number-Based Winner Selection
// ============================================================================

/**
 * Select winners based on number matching
 * Used when drawing.winnerSelection = 'number'
 *
 * Process:
 * 1. Generate or use existing winner numbers
 * 2. Find participants who own those numbers (via numberSlots)
 * 3. If a number has no eligible participant, assign to random eligible participant
 * 4. Insert into drawingWinners table
 *
 * Option 1 Implementation: Always guarantee winners by reassigning
 *
 * @param params - Number-based winner selection parameters
 * @returns Winner information including winning numbers
 */
export async function selectNumberWinners(
  params: SelectNumberWinnersParams,
): Promise<{
  winners: WinnerSelectionResult['winners']
  winnerNumbers: number[]
}> {
  const {
    drawingId,
    winnersAmount,
    quantityOfNumbers,
    winnerSelectionIsManually,
    existingWinnerNumbers,
  } = params

  // Step 1: Determine winning numbers
  let winnerNumbers: number[]

  if (!winnerSelectionIsManually) {
    // Generate random winning numbers (system generated)
    winnerNumbers = generateUniqueRandomNumbers(
      1,
      quantityOfNumbers,
      winnersAmount,
    )
  } else {
    // Use pre-defined winner numbers (manually entered)
    if (!existingWinnerNumbers || existingWinnerNumbers.length === 0) {
      throw new Error('Winner numbers not defined for manual selection')
    }
    winnerNumbers = existingWinnerNumbers.slice(0, winnersAmount)
  }

  // Step 2: Find participants who own these winning numbers
  const numberSlotsWithParticipants = await db
    .select({
      number: numberSlots.number,
      participantId: numberSlots.participantId,
      participantName: participants.name,
      isEligible: participants.isEligible,
      status: numberSlots.status,
    })
    .from(numberSlots)
    .leftJoin(participants, eq(numberSlots.participantId, participants.id))
    .where(
      and(
        eq(numberSlots.drawingId, drawingId),
        inArray(numberSlots.number, winnerNumbers),
      ),
    )

  // Step 3: Build winner list, handling numbers without eligible participants
  const winners: WinnerSelectionResult['winners'] = []
  const participantIdsUsed = new Set<number>()

  // Get all eligible participants for reassignment
  const allEligibleParticipants = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.drawingId, drawingId),
        eq(participants.isEligible, true),
      ),
    )

  if (allEligibleParticipants.length === 0) {
    throw new Error('No eligible participants found for winner selection')
  }

  // Shuffle eligible participants for random assignment
  const shuffledEligible = shuffleArray(allEligibleParticipants)
  let eligibleIndex = 0

  for (const winnerNumber of winnerNumbers) {
    // Find the slot for this winning number
    const slot = numberSlotsWithParticipants.find(
      (s: (typeof numberSlotsWithParticipants)[0]) => s.number === winnerNumber,
    )

    // Check if slot has an eligible participant
    if (
      slot &&
      slot.participantId &&
      slot.isEligible === true &&
      slot.status === 'taken' &&
      !participantIdsUsed.has(slot.participantId)
    ) {
      // Number has an eligible participant - they win!
      winners.push({
        participantId: slot.participantId,
        participantName: slot.participantName!,
        winningNumber: winnerNumber,
      })
      participantIdsUsed.add(slot.participantId)
    } else {
      // Option 1: Number is available/rejected - assign to random eligible participant
      // Find next eligible participant who hasn't won yet
      while (
        eligibleIndex < shuffledEligible.length &&
        participantIdsUsed.has(shuffledEligible[eligibleIndex]!.id)
      ) {
        eligibleIndex++
      }

      if (eligibleIndex < shuffledEligible.length) {
        const assignedParticipant = shuffledEligible[eligibleIndex]!
        winners.push({
          participantId: assignedParticipant.id,
          participantName: assignedParticipant.name,
          winningNumber: winnerNumber,
        })
        participantIdsUsed.add(assignedParticipant.id)
        eligibleIndex++
      } else {
        // Not enough unique participants for all winning numbers
        throw new Error(
          `Cannot assign winning number ${winnerNumber}: not enough eligible participants`,
        )
      }
    }
  }

  // Step 4: Insert winners into drawingWinners table
  const winnersData = winners.map((winner) => ({
    drawingId,
    participantId: winner.participantId,
  }))

  await db.insert(drawingWinners).values(winnersData)

  return {
    winners,
    winnerNumbers,
  }
}

// ============================================================================
// Main Winner Selection Function
// ============================================================================

/**
 * Main orchestrator for winner selection
 *
 * Validates drawing state, determines selection method,
 * and delegates to appropriate selection function.
 *
 * Hosts can re-run winner selection multiple times.
 * Previous winners will be cleared before selecting new ones.
 *
 * @param drawingId - ID of the drawing to select winners for
 * @returns Complete winner selection result
 * @throws Error if drawing not found or hasn't ended
 */
export async function selectWinners(
  drawingId: string,
): Promise<WinnerSelectionResult> {
  // Fetch drawing configuration
  const drawing = await db
    .select()
    .from(drawings)
    .where(eq(drawings.id, drawingId))
    .limit(1)

  if (!drawing || drawing.length === 0) {
    throw new Error(`Drawing ${drawingId} not found`)
  }

  const drawingData = drawing[0]

  // Validate drawing has ended
  validateDrawingEnded(drawingData.endAt)

  // Clear existing winners if any (allow re-running selection)
  const existingWinners = await db
    .select()
    .from(drawingWinners)
    .where(eq(drawingWinners.drawingId, drawingId))

  if (existingWinners.length > 0) {
    await db
      .delete(drawingWinners)
      .where(eq(drawingWinners.drawingId, drawingId))
  }

  // Select winners based on method
  const timestamp = new Date()
  let result: WinnerSelectionResult

  // Check if this drawing uses number slots (playWithNumbers)
  // If not using numbers, always select randomly from participants
  if (!drawingData.playWithNumbers) {
    // Random participant selection (no number slots)
    const winners = await selectRandomWinners({
      drawingId,
      winnersAmount: drawingData.winnersAmount,
    })

    result = {
      drawingId,
      winners,
      selectionMethod: 'random',
      timestamp,
    }
  } else {
    // Number-based selection (playWithNumbers = true)
    const isSystemGenerated = drawingData.winnerSelection === 'system'

    const { winners, winnerNumbers } = await selectNumberWinners({
      drawingId,
      winnersAmount: drawingData.winnersAmount,
      quantityOfNumbers: drawingData.quantityOfNumbers,
      winnerSelectionIsManually: !isSystemGenerated,
      existingWinnerNumbers: drawingData.winnerNumbers,
    })

    // Update drawing with winner numbers if they were system generated
    if (isSystemGenerated) {
      await db
        .update(drawings)
        .set({ winnerNumbers })
        .where(eq(drawings.id, drawingId))
    }

    result = {
      drawingId,
      winners,
      winnerNumbers,
      selectionMethod: 'number',
      timestamp,
    }
  }

  return result
}

// ============================================================================
// Get Winners (Query Function)
// ============================================================================

/**
 * Retrieve winners for a drawing
 *
 * @param drawingId - ID of the drawing
 * @returns Winner information with participant details
 */
export async function getDrawingWinners(drawingId: string) {
  const winners = await db
    .select({
      participantId: drawingWinners.participantId,
      participantName: participants.name,
      participantEmail: participants.email,
      participantPhone: participants.phone,
      selectedAt: drawingWinners.selectedAt,
    })
    .from(drawingWinners)
    .innerJoin(participants, eq(drawingWinners.participantId, participants.id))
    .where(eq(drawingWinners.drawingId, drawingId))

  // Get drawing info to include winner numbers
  const drawing = await db
    .select({
      winnerNumbers: drawings.winnerNumbers,
      winnerSelection: drawings.winnerSelection,
    })
    .from(drawings)
    .where(eq(drawings.id, drawingId))
    .limit(1)

  return {
    winners,
    winnerNumbers: drawing[0]?.winnerNumbers || null,
    selectionMethod: drawing[0]?.winnerSelection || null,
  }
}
