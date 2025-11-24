/**
 * Winner Selection Utilities
 *
 * Helper functions for winner selection logic including:
 * - Array shuffling for random selection
 * - Random number generation
 * - Drawing state validation
 */

/**
 * Fisher-Yates shuffle algorithm for random array ordering
 * @param array - Array to shuffle (will be modified in place)
 * @returns The shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Generate unique random numbers within a range
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param count - Number of unique random numbers to generate
 * @returns Array of unique random numbers
 */
export function generateUniqueRandomNumbers(
  min: number,
  max: number,
  count: number,
): number[] {
  if (count > max - min + 1) {
    throw new Error(
      `Cannot generate ${count} unique numbers from range ${min}-${max}`,
    )
  }

  const numbers = new Set<number>()
  while (numbers.size < count) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min
    numbers.add(randomNum)
  }

  return Array.from(numbers).sort((a, b) => a - b)
}

/**
 * Validate that a drawing has ended and is ready for winner selection
 * @param endAt - Drawing end timestamp
 * @returns true if drawing has ended
 * @throws Error if drawing hasn't ended yet
 */
export function validateDrawingEnded(endAt: Date): boolean {
  const now = new Date()
  if (now < endAt) {
    throw new Error(`Drawing has not ended yet. Ends at ${endAt.toISOString()}`)
  }
  return true
}

/**
 * Validate winner selection parameters
 * @param winnersAmount - Number of winners to select
 * @param eligibleCount - Number of eligible participants
 * @throws Error if parameters are invalid
 */
export function validateWinnerSelection(
  winnersAmount: number,
  eligibleCount: number,
): void {
  if (winnersAmount < 1) {
    throw new Error('Winners amount must be at least 1')
  }

  if (eligibleCount === 0) {
    throw new Error('No eligible participants found for winner selection')
  }

  if (winnersAmount > eligibleCount) {
    throw new Error(
      `Cannot select ${winnersAmount} winners from ${eligibleCount} eligible participants`,
    )
  }
}
