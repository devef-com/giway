import { db } from '@/db/index'
import { participantComments, participants, drawings, user } from '@/db/schema'
import { eq, and, desc, or } from 'drizzle-orm'

export interface CreateHostCommentParams {
  participantId: number
  authorId: string
  comment: string
  isVisibleToParticipant?: boolean
}

export interface CreateParticipantCommentParams {
  participantId: number
  comment: string
}

export interface UpdateCommentParams {
  commentId: number
  comment?: string
  isVisibleToParticipant?: boolean
}

/**
 * Verify that the user owns the drawing associated with the participant
 */
export async function verifyDrawingOwnership(
  participantId: number,
  userId: string,
): Promise<boolean> {
  const result = await db
    .select({ userId: drawings.userId })
    .from(participants)
    .innerJoin(drawings, eq(participants.drawingId, drawings.id))
    .where(eq(participants.id, participantId))
    .limit(1)

  return result.length > 0 && result[0].userId === userId
}

/**
 * Create a new comment from host
 */
export async function createHostComment(
  params: CreateHostCommentParams,
): Promise<{ success: boolean; comment?: any; error?: string }> {
  try {
    // Get host name
    const hostUser = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, params.authorId))
      .limit(1)

    const [comment] = await db
      .insert(participantComments)
      .values({
        participantId: params.participantId,
        authorId: params.authorId,
        authorType: 'host',
        authorName: hostUser[0]?.name || 'Host',
        comment: params.comment,
        isVisibleToParticipant: params.isVisibleToParticipant ?? true,
      })
      .returning()

    return { success: true, comment }
  } catch (error) {
    console.error('Error creating host comment:', error)
    return { success: false, error: 'Failed to create comment' }
  }
}

/**
 * Create a new comment from participant (no authentication required)
 */
export async function createParticipantComment(
  params: CreateParticipantCommentParams,
): Promise<{ success: boolean; comment?: any; error?: string }> {
  try {
    // Get participant name
    const participant = await db
      .select({ name: participants.name })
      .from(participants)
      .where(eq(participants.id, params.participantId))
      .limit(1)

    if (!participant || participant.length === 0) {
      return { success: false, error: 'Participant not found' }
    }

    const [comment] = await db
      .insert(participantComments)
      .values({
        participantId: params.participantId,
        authorId: null, // No user account for participants
        authorType: 'participant',
        authorName: participant[0].name,
        comment: params.comment,
        isVisibleToParticipant: true, // Always visible
      })
      .returning()

    return { success: true, comment }
  } catch (error) {
    console.error('Error creating participant comment:', error)
    return { success: false, error: 'Failed to create comment' }
  }
}

/**
 * Get all comments for a participant (host view - includes private comments)
 */
export async function getCommentsForHost(
  participantId: number,
): Promise<Array<any>> {
  return await db
    .select({
      id: participantComments.id,
      participantId: participantComments.participantId,
      comment: participantComments.comment,
      authorId: participantComments.authorId,
      authorType: participantComments.authorType,
      authorName: participantComments.authorName,
      isVisibleToParticipant: participantComments.isVisibleToParticipant,
      createdAt: participantComments.createdAt,
      updatedAt: participantComments.updatedAt,
    })
    .from(participantComments)
    .where(eq(participantComments.participantId, participantId))
    .orderBy(participantComments.createdAt) // Chronological order for conversation flow
}

/**
 * Get visible comments for a participant (participant view)
 * Returns all comments: participant comments + visible host comments
 */
export async function getCommentsForParticipant(
  participantId: number,
): Promise<Array<any>> {
  return await db
    .select({
      id: participantComments.id,
      comment: participantComments.comment,
      authorType: participantComments.authorType,
      authorName: participantComments.authorName,
      createdAt: participantComments.createdAt,
    })
    .from(participantComments)
    .where(
      and(
        eq(participantComments.participantId, participantId),
        or(
          eq(participantComments.authorType, 'participant'), // All participant comments
          eq(participantComments.isVisibleToParticipant, true), // Visible host comments
        ),
      ),
    )
    .orderBy(participantComments.createdAt) // Chronological order
}

/**
 * Update an existing comment
 */
export async function updateComment(
  params: UpdateCommentParams,
  authorId: string,
): Promise<{ success: boolean; comment?: any; error?: string }> {
  try {
    // Verify ownership
    const existingComment = await db
      .select()
      .from(participantComments)
      .where(eq(participantComments.id, params.commentId))
      .limit(1)

    if (existingComment.length === 0) {
      return { success: false, error: 'Comment not found' }
    }

    if (existingComment[0].authorId !== authorId) {
      return { success: false, error: 'Unauthorized' }
    }

    const updateData: any = {}
    if (params.comment !== undefined) {
      updateData.comment = params.comment
    }
    if (params.isVisibleToParticipant !== undefined) {
      updateData.isVisibleToParticipant = params.isVisibleToParticipant
    }

    const [comment] = await db
      .update(participantComments)
      .set(updateData)
      .where(eq(participantComments.id, params.commentId))
      .returning()

    return { success: true, comment }
  } catch (error) {
    console.error('Error updating comment:', error)
    return { success: false, error: 'Failed to update comment' }
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: number,
  authorId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify ownership
    const existingComment = await db
      .select()
      .from(participantComments)
      .where(eq(participantComments.id, commentId))
      .limit(1)

    if (existingComment.length === 0) {
      return { success: false, error: 'Comment not found' }
    }

    if (existingComment[0].authorId !== authorId) {
      return { success: false, error: 'Unauthorized' }
    }

    await db
      .delete(participantComments)
      .where(eq(participantComments.id, commentId))

    return { success: true }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return { success: false, error: 'Failed to delete comment' }
  }
}
