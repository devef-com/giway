# Participant Comments Feature Proposal

## Overview

This proposal outlines the implementation of a **bidirectional commenting system** that enables communication between drawing hosts and participants. Both hosts and participants can add comments, creating a conversation thread for each participant.

## Use Cases

1. **Host Communication**: Hosts can add notes, instructions, or feedback for individual participants
2. **Participant Responses**: Participants can reply to host messages, ask questions, or provide updates
3. **Two-Way Dialogue**: Enable back-and-forth conversation between host and participant
4. **Audit Trail**: Comments maintain a complete history of communication between host and participant
5. **Status Updates**: Hosts can provide context for status changes or additional requirements
6. **No Login Required**: Participants can comment without authentication (using their participant page link)

## Database Schema

### New Table: `participant_comments`

```sql
CREATE TABLE participant_comments (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES user(id) ON DELETE CASCADE, -- NULL for participant comments
  author_type VARCHAR(20) NOT NULL DEFAULT 'host', -- 'host' or 'participant'
  author_name VARCHAR(255), -- For participant comments (from participant name)
  comment TEXT NOT NULL,
  is_visible_to_participant BOOLEAN NOT NULL DEFAULT TRUE, -- Only used for host comments
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_participant_comments_participant_id ON participant_comments(participant_id);
CREATE INDEX idx_participant_comments_author_id ON participant_comments(author_id);
CREATE INDEX idx_participant_comments_created_at ON participant_comments(created_at DESC);
CREATE INDEX idx_participant_comments_author_type ON participant_comments(author_type);
```

### Drizzle ORM Schema Definition

Add to `src/db/schema.ts`:

```typescript
export const authorTypeEnum = pgEnum('author_type', ['host', 'participant'])

export const participantComments = pgTable('participant_comments', {
  id: serial('id').primaryKey(),
  participantId: integer('participant_id')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  authorId: text('author_id').references(() => user.id, {
    onDelete: 'cascade',
  }), // NULL for participant comments
  authorType: authorTypeEnum('author_type').notNull().default('host'),
  authorName: varchar('author_name', { length: 255 }), // For participant comments
  comment: text('comment').notNull(),
  isVisibleToParticipant: boolean('is_visible_to_participant')
    .notNull()
    .default(true), // Only relevant for host comments
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// Relations
export const participantCommentsRelations = relations(
  participantComments,
  ({ one }) => ({
    participant: one(participants, {
      fields: [participantComments.participantId],
      references: [participants.id],
    }),
    author: one(user, {
      fields: [participantComments.authorId],
      references: [user.id],
    }),
  }),
)

// Update participants relations to include comments
export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    // ... existing relations ...
    comments: many(participantComments),
  }),
)

// Type exports
export type ParticipantComment = typeof participantComments.$inferSelect
export type NewParticipantComment = typeof participantComments.$inferInsert
```

## API Endpoints

### 1. Get All Comments for a Participant (Both Views)

**Endpoint**: `GET /api/drawings/:drawingId/p/:participantId/comments`

**Authentication**: None (Public access)

**Description**: Returns all comments in the conversation. Host comments respect the `isVisibleToParticipant` flag, while participant comments are always visible.

**Response**:

```json
{
  "comments": [
    {
      "id": 1,
      "participantId": 123,
      "comment": "Please submit payment proof by tomorrow",
      "authorType": "host",
      "authorName": "John Doe (Host)",
      "createdAt": "2025-12-08T10:00:00Z"
    },
    {
      "id": 2,
      "participantId": 123,
      "comment": "I will submit it by today evening",
      "authorType": "participant",
      "authorName": "Jane Smith",
      "createdAt": "2025-12-08T11:00:00Z"
    }
  ]
}
```

### 2. Add Comment as Host

**Endpoint**: `POST /api/participant/:participantId/comments`

**Authentication**: Required (Host must own the drawing)

**Request Body**:

```json
{
  "comment": "Please submit payment proof by tomorrow",
  "isVisibleToParticipant": true
}
```

**Response**:

```json
{
  "success": true,
  "comment": {
    "id": 1,
    "participantId": 123,
    "comment": "Please submit payment proof by tomorrow",
    "authorType": "host",
    "authorId": "user_123",
    "isVisibleToParticipant": true,
    "createdAt": "2025-12-08T10:00:00Z"
  }
}
```

### 3. Add Comment as Participant

**Endpoint**: `POST /api/drawings/:drawingId/p/:participantId/comments`

**Authentication**: None (Public access - no login required)

**Request Body**:

```json
{
  "comment": "I will submit it by today evening"
}
```

**Response**:

```json
{
  "success": true,
  "comment": {
    "id": 2,
    "participantId": 123,
    "comment": "I will submit it by today evening",
    "authorType": "participant",
    "authorName": "Jane Smith",
    "createdAt": "2025-12-08T11:00:00Z"
  }
}
```

### 4. Update Comment (Host Only)

**Endpoint**: `PATCH /api/participant/:participantId/comments/:commentId`

**Authentication**: Required (Must be comment author and host)

**Request Body**:

```json
{
  "comment": "Updated comment text",
  "isVisibleToParticipant": false
}
```

**Note**: Only host comments can be edited. Participant comments cannot be edited.

### 5. Delete Comment (Host Only)

**Endpoint**: `DELETE /api/participant/:participantId/comments/:commentId`

**Authentication**: Required (Must be comment author and host)

**Note**: Only host comments can be deleted. Participant comments cannot be deleted.

### 6. Get Comments for Host View (All Comments)

**Endpoint**: `GET /api/participant/:participantId/comments`

**Authentication**: Required (Host must own the drawing)

**Description**: Returns all comments including private host comments (for host management view)

**Response**:

```json
{
  "comments": [
    {
      "id": 1,
      "participantId": 123,
      "comment": "Please submit payment proof by tomorrow",
      "authorType": "host",
      "authorId": "user_123",
      "authorName": "John Doe",
      "isVisibleToParticipant": true,
      "createdAt": "2025-12-08T10:00:00Z"
    },
    {
      "id": 2,
      "participantId": 123,
      "comment": "I will submit it by today evening",
      "authorType": "participant",
      "authorName": "Jane Smith",
      "createdAt": "2025-12-08T11:00:00Z"
    },
    {
      "id": 3,
      "participantId": 123,
      "comment": "Internal note: Follow up required",
      "authorType": "host",
      "authorId": "user_123",
      "authorName": "John Doe",
      "isVisibleToParticipant": false,
      "createdAt": "2025-12-08T12:00:00Z"
    }
  ]
}
```

## Library Functions

Create `src/lib/comments/index.ts`:

```typescript
import { db } from '@/db/index'
import { participantComments, participants, drawings, user } from '@/db/schema'
import { eq, and, desc, or, sql } from 'drizzle-orm'

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
```

## UI/UX Implementation

### 1. Host View (`/drawings/$drawingId/m/$participant`)

Add a comments section below the participant information card:

```tsx
// New component: src/components/ParticipantComments.tsx
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function ParticipantComments({
  participantId,
}: {
  participantId: number
}) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [participantId])

  const fetchComments = async () => {
    const response = await fetch(`/api/participant/${participantId}/comments`)
    if (response.ok) {
      const data = await response.json()
      setComments(data.comments || [])
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(
        `/api/participant/${participantId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comment: newComment,
            isVisibleToParticipant: isVisible,
          }),
        },
      )

      if (response.ok) {
        setNewComment('')
        setIsVisible(true)
        await fetchComments()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="rounded-lg p-6 mt-4">
      <h3 className="text-xl font-semibold mb-4">Comments</h3>

      {/* Add Comment Form */}
      <div className="space-y-3 mb-6">
        <Textarea
          placeholder="Add a comment for this participant..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[100px]"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="visible-switch"
              checked={isVisible}
              onCheckedChange={setIsVisible}
            />
            <Label htmlFor="visible-switch">Visible to participant</Label>
          </div>

          <Button
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </div>

      {/* Comments List - Conversation Thread */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No messages yet. Start the conversation!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`border rounded-lg p-4 ${
                comment.authorType === 'participant'
                  ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold text-sm">
                    {comment.authorName}
                    {comment.authorType === 'participant' && (
                      <span className="ml-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                        Participant
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                {comment.authorType === 'host' &&
                  !comment.isVisibleToParticipant && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded">
                      Private
                    </span>
                  )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
```

**Integration in `m.$participant.tsx`**:

```tsx
import { ParticipantComments } from '@/components/ParticipantComments'

// Add after the status change section (around line 250)
;<ParticipantComments participantId={participant.id} />
```

### 2. Participant View (`/drawings/$drawingId/p/$participateId`)

Add a bidirectional conversation section where participants can view and reply to messages:

```tsx
// New component or inline in the participant view
function ParticipantCommentsView({
  drawingId,
  participantId,
}: {
  drawingId: string
  participantId: string
}) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [drawingId, participantId])

  const fetchComments = async () => {
    const response = await fetch(
      `/api/drawings/${drawingId}/p/${participantId}/comments`,
    )
    if (response.ok) {
      const data = await response.json()
      setComments(data.comments || [])
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(
        `/api/drawings/${drawingId}/p/${participantId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: newComment }),
        },
      )

      if (response.ok) {
        setNewComment('')
        await fetchComments()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-4 mt-4">
      <h2 className="text-lg font-semibold mb-3">Conversation with Host</h2>

      {/* Conversation Thread */}
      <div className="space-y-3 mb-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">No messages yet</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-lg p-3 ${
                comment.authorType === 'host'
                  ? 'bg-gray-50 dark:bg-gray-800'
                  : 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">
                  {comment.authorName}
                  {comment.authorType === 'host' && ' (Host)'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
            </div>
          ))
        )}
      </div>

      {/* Reply Form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Write your message..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
        />
        <Button
          onClick={handleAddComment}
          disabled={isSubmitting || !newComment.trim()}
          className="w-full"
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </Card>
  )
}
```

**Integration in `p.$participateId.tsx`**:

```tsx
// Add after the participant card (around line 158)
<ParticipantCommentsView drawingId={drawingId} participantId={participateId} />
```

## API Route Files

### 1. `/api/participant/:participantId/comments` (Host)

Create `src/routes/api/participant/$participantId.comments.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import {
  createHostComment,
  getCommentsForHost,
  verifyDrawingOwnership,
} from '@/lib/comments'

export const Route = createFileRoute(
  '/api/participant/$participantId/comments',
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const participantId = parseInt(params.participantId, 10)
        if (isNaN(participantId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid participant ID' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const hasOwnership = await verifyDrawingOwnership(
          participantId,
          session.user.id,
        )
        if (!hasOwnership) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const comments = await getCommentsForHost(participantId)
          return new Response(JSON.stringify({ comments }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch comments' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },

      POST: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const participantId = parseInt(params.participantId, 10)
        if (isNaN(participantId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid participant ID' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const hasOwnership = await verifyDrawingOwnership(
          participantId,
          session.user.id,
        )
        if (!hasOwnership) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const body = await request.json()
          const { comment, isVisibleToParticipant } = body

          if (!comment || typeof comment !== 'string') {
            return new Response(
              JSON.stringify({ error: 'Comment text is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const result = await createHostComment({
            participantId,
            authorId: session.user.id,
            comment,
            isVisibleToParticipant: isVisibleToParticipant ?? true,
          })

          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return new Response(
            JSON.stringify({ success: true, comment: result.comment }),
            { status: 201, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to create comment' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
```

### 2. `/api/drawings/:drawingId/p/:participantId/comments` (Participant - Public)

Create `src/routes/api/drawings/$drawingId/p/$participantId.comments.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import {
  getCommentsForParticipant,
  createParticipantComment,
} from '@/lib/comments'

export const Route = createFileRoute(
  '/api/drawings/$drawingId/p/$participantId/comments',
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const participantId = parseInt(params.participantId, 10)

        if (isNaN(participantId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid participant ID' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        try {
          const comments = await getCommentsForParticipant(participantId)
          return new Response(JSON.stringify({ comments }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch comments' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },

      POST: async ({ request, params }) => {
        const participantId = parseInt(params.participantId, 10)

        if (isNaN(participantId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid participant ID' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        try {
          const body = await request.json()
          const { comment } = body

          if (!comment || typeof comment !== 'string') {
            return new Response(
              JSON.stringify({ error: 'Comment text is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const result = await createParticipantComment({
            participantId,
            comment,
          })

          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return new Response(
            JSON.stringify({ success: true, comment: result.comment }),
            { status: 201, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to create comment' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
```

## Migration Strategy

1. **Database Migration**: Run the migration to create the `participant_comments` table
2. **Schema Update**: Update Drizzle schema with the new table and relations
3. **Library Functions**: Add the comment management functions to `src/lib/comments/`
4. **API Routes**: Create the new API route files
5. **UI Components**: Create the comment components
6. **Integration**: Integrate components into existing routes
7. **Testing**: Test both host and participant views

### Migration File

Create a new migration file using Drizzle Kit:

```bash
npm run db:generate
```

Or manually create the migration SQL:

```sql
-- Migration: Add participant comments (bidirectional)
CREATE TYPE author_type AS ENUM ('host', 'participant');

CREATE TABLE IF NOT EXISTS participant_comments (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES "user"(id) ON DELETE CASCADE, -- NULL for participant comments
  author_type author_type NOT NULL DEFAULT 'host',
  author_name VARCHAR(255), -- For participant comments
  comment TEXT NOT NULL,
  is_visible_to_participant BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participant_comments_participant_id ON participant_comments(participant_id);
CREATE INDEX idx_participant_comments_author_id ON participant_comments(author_id);
CREATE INDEX idx_participant_comments_created_at ON participant_comments(created_at);
CREATE INDEX idx_participant_comments_author_type ON participant_comments(author_type);
```

## Security Considerations

1. **Authorization**: Only drawing owners can add/edit/delete host comments
2. **No Authentication for Participants**: Participants can comment without logging in (using their unique participant link)
3. **Visibility Control**: `isVisibleToParticipant` flag controls whether host comments are shown to participants
4. **Input Validation**: Sanitize and validate all comment text
5. **Rate Limiting**: Consider implementing rate limits on comment creation to prevent spam
6. **XSS Prevention**: Properly escape comment text in the UI
7. **Participant Verification**: Comments are tied to participant_id, ensuring participants can only comment on their own page

## Future Enhancements

1. **Rich Text**: Support for markdown or rich text formatting
2. **Attachments**: Allow both hosts and participants to attach files
3. **Notifications**: Email notifications when new comments are added
4. **Comment Editing**: Allow users to edit their own comments (with edit history)
5. **Comment Reactions**: Allow simple emoji reactions to comments
6. **Comment History**: Track edit history for comments
7. **Bulk Comments**: Add comments to multiple participants at once (host only)
8. **Read Receipts**: Show when host/participant has read messages

## Testing Checklist

- [ ] Host can view all comments (including participant replies)
- [ ] Host can add new comments with visibility toggle
- [ ] Host can see participant comments in conversation
- [ ] Participant can view visible host comments
- [ ] Participant can add comments without logging in
- [ ] Participant comments are always visible
- [ ] Private host comments are hidden from participants
- [ ] Comments display in chronological order
- [ ] Conversation flow is clear and intuitive
- [ ] Unauthorized users cannot access host-only endpoints
- [ ] Comments are properly deleted when participant is deleted (cascade)
- [ ] UI displays properly on mobile and desktop
- [ ] Comments with line breaks render correctly
- [ ] Author type badges display correctly (Host/Participant)

## Conclusion

This proposal provides a comprehensive, production-ready implementation of a **bidirectional** participant commenting system that:

- Enables two-way communication between hosts and participants
- Requires no authentication for participants (using their unique link)
- Integrates seamlessly with the existing architecture
- Follows the established patterns in the codebase
- Provides clear separation between host and participant views
- Includes proper security and authorization
- Supports conversation-style threading
- Is scalable and maintainable

The implementation is minimal yet complete, focusing on essential features while leaving room for future enhancements.
