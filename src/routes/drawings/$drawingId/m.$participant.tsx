import { Participant } from '@/db/schema';
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/drawings/$drawingId/m/$participant')({
  component: RouteComponent,
})

function RouteComponent() {
  const { participant: participantId } = Route.useParams();
  const location = useLocation();
  const participant = (location.state as unknown as Participant) || null;

  if (!participant) {
    return <div>Participant not found</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Participant Information</h2>
          <div className="space-y-3">
            <div>
              <span className="font-semibold">Name:</span> {participant.name}
            </div>
            <div>
              <span className="font-semibold">Phone:</span> {participant.phone}
            </div>
            {participant.email && (
              <div>
                <span className="font-semibold">Email:</span> {participant.email}
              </div>
            )}
          </div>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600">Debug Info</summary>
          <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify({ participantId, participant }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
