import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import {
  createHostComment,
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

          const result = await createHostComment({
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
