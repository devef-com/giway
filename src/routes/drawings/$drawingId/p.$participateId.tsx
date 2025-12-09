import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Download, InfoIcon } from 'lucide-react'
// import html2pdf from "html2pdf.js";
import QRCodeSVG from 'qrcode-svg'
import { jsPDF } from 'jspdf'
import 'svg2pdf.js'
import type { Participant } from '@/db/schema'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDrawing } from '@/querys/useDrawing'
import { ParticipantCommentsView } from '@/components/ParticipantCommentsView'

const HOST = import.meta.env.APP_HOST || 'http://localhost:3000'

export const Route = createFileRoute('/drawings/$drawingId/p/$participateId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { drawingId, participateId } = Route.useParams()

  const { data: drawingData } = useDrawing(drawingId)

  const {
    data: participantData,
    isLoading,
    error,
  } = useQuery<Participant & { numbers: Array<number> }>({
    queryKey: ['participant', drawingId, participateId],
    queryFn: async () => {
      const response = await fetch(
        `/api/drawings/${drawingId}/${participateId}`,
      )
      if (!response.ok) throw await response.json()
      return response.json()
    },
    retry(failureCount, error) {
      console.log(typeof error)
      console.log(JSON.stringify(error))
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.log(
          'Retrying due to fetch failure:',
          failureCount,
          error.message,
        )
        return false
      }
      if ('error' in error) {
        console.log('API returned error:', failureCount, error.error)
      }
      if (failureCount < 2) {
        return true
      }
      return false
    },
  })

  const handleDownloadPdf = async () => {
    const doc = new jsPDF({
      unit: 'pt',
      format: [500, 250],
      orientation: 'landscape',
    })

    // Generate QR SVG string
    const qrSvgString = new QRCodeSVG({
      content: `${HOST}/drawings/${drawingId}/p/${participateId}`,
      padding: 4,
      width: 180,
      height: 180,
      color: 'white',
      background: 'transparent',
      ecl: 'M',
      join: true,
    }).svg()

    // Construct the full SVG for the card
    const cardSvg = `
            <svg width="500" height="250" viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="500" height="250" rx="40" ry="40" fill="#000000" />
              <text x="40" y="90" font-family="Helvetica, sans-serif" font-size="60" font-weight="bold" fill="#ffffff">Giway</text>
              <text x="40" y="215" font-family="Helvetica, sans-serif" font-size="14" font-weight="normal" fill="#2a2a2a">${drawingId}/${participateId}</text>
              <line x1="280" y1="25" x2="280" y2="225" stroke="#ffffff" stroke-width="2" />
              <g transform="translate(305, 35)">
                ${qrSvgString.replace(
                  '<?xml version="1.0" standalone="yes"?>',
                  '',
                )}
              </g>
            </svg>
          `

    // Create a temporary container for the SVG
    const container = document.createElement('div')
    container.innerHTML = cardSvg
    const svgElement = container.firstElementChild
    if (!svgElement) {
      return
    }

    // Render SVG to PDF
    await doc.svg(svgElement, {
      x: 0,
      y: 0,
      width: 500,
      height: 250,
    })

    doc.save('giway-card-vector.pdf')
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md mt-10">
        Error: {JSON.stringify(error)}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md p-4">
      {participantData ? (
        <>
          <Card className="p-4">
            <h1 className="text-regular font-semibold line-clamp-2">
              Participant for Drawing - {drawingData?.title}
            </h1>
            <div className="flex items-center gap-4">
              <p className="m-0">Status:</p>

              <p
                className={cn(
                  'border',
                  participantData.isEligible &&
                    'border-green-500 text-green-600 bg-green-700/20',
                  participantData.isEligible == null
                    ? 'border-2'
                    : !participantData.isEligible &&
                        'border-red-500 text-red-700 bg-red-900/20',
                  'px-3 py-1 rounded inline-block font-medium',
                )}
              >
                {participantData.isEligible
                  ? 'Approved'
                  : participantData.isEligible == null
                    ? 'Pending'
                    : 'Not Eligible'}
              </p>
            </div>

            <span className="text-sm inline-flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
              <InfoIcon size={18} />
              {participantData.isEligible == null
                ? 'Your participation is pending approval.'
                : ''}
            </span>
          </Card>

          <div className="max-w-[500px] h-[250px] mt-4 bg-[#000000] rounded-[2.5rem] grid grid-cols-[1fr_2px_1fr] items-center overflow-hidden relative p-2 shadow-2xl border border-white/20">
            {/* Left Section */}
            <div className="flex-1 h-full flex flex-col justify-between pl-5 py-8">
              <h1 className="text-[#ffffff] text-xl font-bold tracking-tight">
                Giway
              </h1>

              {/* Dark grey ID code */}
              <p className="text-[#2a2a2a] text-sm font-medium tracking-wide">
                {drawingId}/{participateId}
              </p>
            </div>

            {/* Vertical Divider Line - bg-white -> bg-[#ffffff] */}
            <div className="h-[80%] w-px bg-[#ffffff] opacity-100 mx-2"></div>

            {/* Right Section */}
            <div className="w-[200px] h-full flex items-center justify-center">
              {/* Grey Box - bg-gray-300 -> bg-[#d1d5db] */}
              <div className="mr-0">
                <span
                  className="w-[200px]"
                  dangerouslySetInnerHTML={{
                    __html: new QRCodeSVG({
                      content: `${HOST}/drawings/${drawingId}/p/${participateId}`,
                      padding: 4,
                      width: 180,
                      height: 180,
                      color: 'white',
                      background: 'transparent',
                      ecl: 'M',
                    }).svg(),
                  }}
                ></span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Download ticket
            </Button>
          </div>

          <ParticipantCommentsView
            drawingId={drawingId}
            participantId={participateId}
          />
        </>
      ) : isLoading ? (
        <div>Loading participant data...</div>
      ) : (
        <div>No participant data found.</div>
      )}
    </div>
  )
}
