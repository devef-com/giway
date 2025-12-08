# Participant Comments Feature Proposal

## Overview

This proposal outlines the implementation of a commenting system that allows drawing hosts to add comments to participants. These comments will be visible to both the host (in the management view) and the participant (in their participant view).

## Use Cases

1. **Host Communication**: Hosts can add notes, instructions, or feedback for individual participants
2. **Participant Information**: Participants can view comments left by the host on their participant page
3. **Audit Trail**: Comments maintain a history of communication between host and participant
4. **Status Updates**: Hosts can provide context for status changes or additional requirements

## Database Schema

### New Table: `participant_comments`

```sql
CREATE TABLE participant_comments (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_visible_to_participant BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_participant_comments_participant_id ON participant_comments(participant_id);
CREATE INDEX idx_participant_comments_author_id ON participant_comments(author_id);
CREATE INDEX idx_participant_comments_created_at ON participant_comments(created_at DESC);
```

### Drizzle ORM Schema Definition

Add to `src/db/schema.ts`:

```typescript
export const participantComments = pgTable('participant_comments', {
  id: serial('id').primaryKey(),
  participantId: integer('participant_id')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  comment: text('comment').notNull(),
  isVisibleToParticipant: boolean('is_visible_to_participant')
    .notNull()
    .default(true),
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

### 1. Get Comments for a Participant (Host View)

**Endpoint**: `GET /api/participant/:participantId/comments`

**Authentication**: Required (Host must own the drawing)

**Response**:
```json
{
  "comments": [
    {
      "id": 1,
      "participantId": 123,
      "comment": "Please submit payment proof by tomorrow",
      "authorId": "user_123",
      "authorName": "John Doe",
      "isVisibleToParticipant": true,
      "createdAt": "2025-12-08T10:00:00Z",
      "updatedAt": "2025-12-08T10:00:00Z"
    }
  ]
}
```

### 2. Add Comment (Host Only)

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
    "authorId": "user_123",
    "isVisibleToParticipant": true,
    "createdAt": "2025-12-08T10:00:00Z"
  }
}
```

### 3. Update Comment (Host Only)

**Endpoint**: `PATCH /api/participant/:participantId/comments/:commentId`

**Authentication**: Required (Must be comment author)

**Request Body**:
```json
{
  "comment": "Updated comment text",
  "isVisibleToParticipant": false
}
```

### 4. Delete Comment (Host Only)

**Endpoint**: `DELETE /api/participant/:participantId/comments/:commentId`

**Authentication**: Required (Must be comment author)

### 5. Get Participant's Comments (Participant View)

**Endpoint**: `GET /api/drawings/:drawingId/p/:participantId/comments`

**Authentication**: None (Public participant view)

**Response**: Only returns comments where `isVisibleToParticipant = true`

```json
{
  "comments": [
    {
      "id": 1,
      "comment": "Thank you for participating!",
      "createdAt": "2025-12-08T10:00:00Z"
    }
  ]
}
```

## Library Functions

Create `src/lib/comments/index.ts`:

```typescript
import { db } from '@/db/index'
import { participantComments, participants, drawings, user } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export interface CreateCommentParams {
  participantId: number
  authorId: string
  comment: string
  isVisibleToParticipant?: boolean
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
 * Create a new comment for a participant
 */
export async function createComment(
  params: CreateCommentParams,
): Promise<{ success: boolean; comment?: any; error?: string }> {
  try {
    const [comment] = await db
      .insert(participantComments)
      .values({
        participantId: params.participantId,
        authorId: params.authorId,
        comment: params.comment,
        isVisibleToParticipant: params.isVisibleToParticipant ?? true,
      })
      .returning()

    return { success: true, comment }
  } catch (error) {
    console.error('Error creating comment:', error)
    return { success: false, error: 'Failed to create comment' }
  }
}

/**
 * Get all comments for a participant (host view)
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
      authorName: user.name,
      authorEmail: user.email,
      isVisibleToParticipant: participantComments.isVisibleToParticipant,
      createdAt: participantComments.createdAt,
      updatedAt: participantComments.updatedAt,
    })
    .from(participantComments)
    .innerJoin(user, eq(participantComments.authorId, user.id))
    .where(eq(participantComments.participantId, participantId))
    .orderBy(desc(participantComments.createdAt))
}

/**
 * Get visible comments for a participant (participant view)
 */
export async function getCommentsForParticipant(
  participantId: number,
): Promise<Array<any>> {
  return await db
    .select({
      id: participantComments.id,
      comment: participantComments.comment,
      createdAt: participantComments.createdAt,
    })
    .from(participantComments)
    .where(
      and(
        eq(participantComments.participantId, participantId),
        eq(participantComments.isVisibleToParticipant, true),
      ),
    )
    .orderBy(desc(participantComments.createdAt))
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

export function ParticipantComments({ participantId }: { participantId: number }) {
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
      const response = await fetch(`/api/participant/${participantId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: newComment,
          isVisibleToParticipant: isVisible,
        }),
      })

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
            <Label htmlFor="visible-switch">
              Visible to participant
            </Label>
          </div>
          
          <Button
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold text-sm">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                {!comment.isVisibleToParticipant && (
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
<ParticipantComments participantId={participant.id} />
```

### 2. Participant View (`/drawings/$drawingId/p/$participateId`)

Add a comments section to show messages from the host:

```tsx
// New component or inline in the participant view
function ParticipantCommentsView({ 
  drawingId, 
  participantId 
}: { 
  drawingId: string
  participantId: string 
}) {
  const [comments, setComments] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/drawings/${drawingId}/p/${participantId}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments || []))
  }, [drawingId, participantId])

  if (comments.length === 0) {
    return null
  }

  return (
    <Card className="p-4 mt-4">
      <h2 className="text-lg font-semibold mb-3">
        Messages from Host
      </h2>
      <div className="space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
          >
            <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

**Integration in `p.$participateId.tsx`**:

```tsx
// Add after the participant card (around line 158)
<ParticipantCommentsView 
  drawingId={drawingId} 
  participantId={participateId} 
/>
```

## API Route Files

### 1. `/api/participant/:participantId/comments` (Host)

Create `src/routes/api/participant/$participantId.comments.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import {
  createComment,
  getCommentsForHost,
  verifyDrawingOwnership,
} from '@/lib/comments'

export const Route = createFileRoute('/api/participant/$participantId/comments')({
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

          const result = await createComment({
            participantId,
            authorId: session.user.id,
            comment,
            isVisibleToParticipant: isVisibleToParticipant ?? true,
          })

          if (!result.success) {
            return new Response(
              JSON.stringify({ error: result.error }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            )
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

### 2. `/api/drawings/:drawingId/p/:participantId/comments` (Participant)

Create `src/routes/api/drawings/$drawingId/p/$participantId.comments.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { getCommentsForParticipant } from '@/lib/comments'

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
-- Migration: Add participant comments
CREATE TABLE IF NOT EXISTS participant_comments (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_visible_to_participant BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participant_comments_participant_id ON participant_comments(participant_id);
CREATE INDEX idx_participant_comments_author_id ON participant_comments(author_id);
CREATE INDEX idx_participant_comments_created_at ON participant_comments(created_at DESC);
```

## Security Considerations

1. **Authorization**: Only drawing owners can add/edit/delete comments
2. **Visibility Control**: `isVisibleToParticipant` flag controls participant access
3. **Input Validation**: Sanitize and validate all comment text
4. **Rate Limiting**: Consider implementing rate limits on comment creation
5. **XSS Prevention**: Properly escape comment text in the UI

## Future Enhancements

1. **Rich Text**: Support for markdown or rich text formatting
2. **Attachments**: Allow hosts to attach files to comments
3. **Notifications**: Email notifications when hosts add comments
4. **Comment Editing**: Allow hosts to edit their comments
5. **Participant Replies**: Allow participants to reply to host comments (optional)
6. **Comment History**: Track edit history for comments
7. **Bulk Comments**: Add comments to multiple participants at once

## Testing Checklist

- [ ] Host can view comments for their participants
- [ ] Host can add new comments
- [ ] Host can toggle visibility of comments
- [ ] Participant can view only visible comments
- [ ] Participant cannot view private comments
- [ ] Comments are sorted by creation date (newest first)
- [ ] Unauthorized users cannot access comments
- [ ] Comments are properly deleted when participant is deleted (cascade)
- [ ] UI displays properly on mobile and desktop
- [ ] Comments with line breaks render correctly

## Conclusion

This proposal provides a comprehensive, production-ready implementation of a participant commenting system that:

- Integrates seamlessly with the existing architecture
- Follows the established patterns in the codebase
- Provides clear separation between host and participant views
- Includes proper security and authorization
- Is scalable and maintainable

The implementation is minimal yet complete, focusing on essential features while leaving room for future enhancements.
