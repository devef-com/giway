import { createFileRoute } from '@tanstack/react-router'
import { Preference } from 'mercadopago'
import { mpClient } from '@/lib/mercadopago'

export const Route = createFileRoute('/api/mercadopago/create-preference')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Intentar leer el body, si falla usar defaults
          let body: { items?: any[] } = {}
          try {
            body = await request.json()
          } catch (e) {
            // Body vacío o inválido
          }

          const preference = new Preference(mpClient)
          let appHost = process.env.APP_HOST || 'http://localhost:3000'
          // Remover trailing slash si existe para evitar doble //
          if (appHost.endsWith('/')) {
            appHost = appHost.slice(0, -1)
          }

          // Mercado Pago requiere una URL válida para auto_return.
          // Localhost a veces es rechazado o requiere https.
          // Usamos una URL pública de prueba si estamos en localhost para evitar el error "back_url.success must be defined"
          const successUrl = appHost.includes('localhost')
            ? 'https://www.mercadopago.com.co'
            : `${appHost}/mercadopago-demo?status=success`

          const preferenceData = {
            body: {
              items: body.items || [
                {
                  title: 'Producto de prueba',
                  quantity: 1,
                  unit_price: 2000,
                  currency_id: 'COP',
                },
              ],
              back_urls: {
                success: successUrl,
                failure: `${appHost}/mercadopago-demo?status=failure`,
                pending: `${appHost}/mercadopago-demo?status=pending`,
              },
              auto_return: 'approved',
            },
          }

          console.log(
            'Creating preference with data:',
            JSON.stringify(preferenceData, null, 2),
          )

          const result = await preference.create(preferenceData)

          return new Response(JSON.stringify({ id: result.id }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error creating preference:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to create preference' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
