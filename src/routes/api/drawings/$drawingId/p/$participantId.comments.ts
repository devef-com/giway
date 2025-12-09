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
