import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/d/$drawingId/p/$participant')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        throw redirect({
          to: `/drawings/$drawingId/p/$participateId`,
          params: {
            drawingId: params.drawingId,
            participateId: params.participant,
          },
        })
      },
    },
  },
})
