import { createFileRoute } from '@tanstack/react-router'
import crypto from 'crypto'

export const Route = createFileRoute('/api/mercadopago/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const dataID = url.searchParams.get('data.id')

          const xSignature = request.headers.get('x-signature')
          const xRequestId = request.headers.get('x-request-id')

          // Si no hay firma, retornamos 200 para no reintentar, pero logueamos error
          // (A veces en desarrollo local no llegan todos los headers si usamos proxies)
          if (!xSignature || !xRequestId || !dataID) {
            console.warn('Webhook recibido sin headers completos o data.id')
            return new Response('Missing signature or data', { status: 200 })
          }

          // Separating the x-signature into parts
          const parts = xSignature.split(',')
          let ts
          let hash

          parts.forEach((part) => {
            const [key, value] = part.split('=')
            if (key && value) {
              const trimmedKey = key.trim()
              const trimmedValue = value.trim()
              if (trimmedKey === 'ts') {
                ts = trimmedValue
              } else if (trimmedKey === 'v1') {
                hash = trimmedValue
              }
            }
          })

          const secret = process.env.MP_WEBHOOK_SECRET
          if (!secret) {
            console.error('MP_WEBHOOK_SECRET not defined in env')
            // Retornamos 500 para que MP reintente luego cuando lo arreglemos
            return new Response('Server Error: Secret not configured', {
              status: 500,
            })
          }

          const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`

          const hmac = crypto.createHmac('sha256', secret)
          hmac.update(manifest)
          const sha = hmac.digest('hex')

          if (sha === hash) {
            console.log('HMAC verification passed')

            // Aquí deberías procesar la notificación
            // Ejemplo: consultar el estado del pago usando mpClient.payment.get(dataID)
            // y actualizar tu base de datos.

            return new Response('OK', { status: 200 })
          } else {
            console.warn('HMAC verification failed')
            return new Response('Verification failed', { status: 401 })
          }
        } catch (e) {
          console.error('Webhook error:', e)
          return new Response('Error processing webhook', { status: 500 })
        }
      },
    },
  },
})
