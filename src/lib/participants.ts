/**
 * Participants Manager
 *
 * Handles participant status management and related operations.
 * Provides utilities for updating participant eligibility status.
 */

import { and, eq } from 'drizzle-orm'
import { db } from '@/db/index'
import { drawings, participants } from '@/db/schema'

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ParticipantStatus = 'pending' | 'approved' | 'rejected'

export interface UpdateParticipantStatusParams {
  participantId: number
  status: ParticipantStatus
}

export interface UpdateParticipantStatusResult {
  success: boolean
  message?: string
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Convert ParticipantStatus to is_eligible boolean value
 *
 * @param status - The participant status
 * @returns The corresponding is_eligible value (null, true, or false)
 *
 * @example
 * statusToIsEligible('pending') // returns null
 * statusToIsEligible('approved') // returns true
 * statusToIsEligible('rejected') // returns false
 */
export function statusToIsEligible(status: ParticipantStatus): boolean | null {
  switch (status) {
    case 'pending':
      return null
    case 'approved':
      return true
    case 'rejected':
      return false
    default:
      throw new Error(`Invalid status: ${status}`)
  }
}

/**
 * Convert is_eligible boolean value to ParticipantStatus
 *
 * @param isEligible - The is_eligible value
 * @returns The corresponding participant status
 *
 * @example
 * isEligibleToStatus(null) // returns 'pending'
 * isEligibleToStatus(true) // returns 'approved'
 * isEligibleToStatus(false) // returns 'rejected'
 */
export function isEligibleToStatus(
  isEligible: boolean | null,
): ParticipantStatus {
  if (isEligible === null) return 'pending'
  return isEligible ? 'approved' : 'rejected'
}

/**
 * Update participant status
 * Changes the is_eligible field based on the provided status
 *
 * @param participantId - The participant identifier
 * @param status - The new status ('pending', 'approved', or 'rejected')
 * @returns Result object with success status and optional message
 *
 * @example
 * const result = await updateParticipantStatus(123, 'approved')
 * if (result.success) {
 *   console.log('Participant approved!')
 * }
 */
export async function updateParticipantStatus(
  participantId: number,
  status: ParticipantStatus,
): Promise<UpdateParticipantStatusResult> {
  try {
    const isEligible = statusToIsEligible(status)

    const result = await db
      .update(participants)
      .set({ isEligible })
      .where(eq(participants.id, participantId))

    const rowsAffected = result.rowCount ?? 0
    if (rowsAffected === 0) {
      return {
        success: false,
        message: 'Participant not found',
      }
    }

    return {
      success: true,
      message: `Participant status updated to ${status}`,
    }
  } catch (error) {
    console.error('Failed to update participant status:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to update participant status',
    }
  }
}

/**
 * Verify that a participant belongs to a drawing owned by a specific user
 * This is important for authorization checks
 *
 * @param participantId - The participant identifier
 * @param userId - The user identifier (drawing owner)
 * @returns True if the participant's drawing is owned by the user, false otherwise
 *
 * @example
 * const canUpdate = await verifyParticipantOwnership(123, 'user-456')
 * if (canUpdate) {
 *   // Allow status update
 * }
 */
export async function verifyParticipantOwnership(
  participantId: number,
  userId: string,
): Promise<boolean> {
  try {
    const result = await db
      .select({
        participantId: participants.id,
      })
      .from(participants)
      .innerJoin(drawings, eq(participants.drawingId, drawings.id))
      .where(
        and(eq(participants.id, participantId), eq(drawings.userId, userId)),
      )
      .limit(1)

    return result.length > 0
  } catch (error) {
    console.error('Failed to verify participant ownership:', error)
    return false
  }
}
