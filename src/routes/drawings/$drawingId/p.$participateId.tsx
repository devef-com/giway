import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/drawings/$drawingId/p/$participateId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { drawingId, participateId } = Route.useParams();



  return <div>Hello "/drawings/{drawingId}/p/{participateId}"!</div>
}
