import { createFileRoute } from '@tanstack/react-router'
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/mercadopago-demo')({
  component: MercadoPagoDemo,
})

function MercadoPagoDemo() {
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Inicializar con Public Key
    // Asegúrate de tener VITE_MP_PUBLIC_KEY en tu archivo .env
    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY
    if (publicKey) {
      initMercadoPago(publicKey, { locale: 'es-CO' });
    } else {
      setError("Falta configurar VITE_MP_PUBLIC_KEY en el archivo .env")
    }
  }, [])

  const createPreference = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              title: "Producto Demo Checkout Pro",
              quantity: 1,
              unit_price: 3600,
              currency_id: 'COP'
            }
          ]
        })
      })

      if (!response.ok) throw new Error('Error al crear preferencia');

      const data = await response.json()
      if (data.id) {
        setPreferenceId(data.id)
      } else {
        throw new Error('No se recibió ID de preferencia');
      }
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al iniciar el pago.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">Mercado Pago Checkout Pro</h1>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded w-full">
          {error}
        </div>
      )}

      {!preferenceId ? (
        <button
          onClick={createPreference}
          disabled={loading || !!error}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
        >
          {loading ? 'Cargando...' : 'Pagar $1,500'}
        </button>
      ) : (
        <div className="w-full mt-4">
          {/* El componente Wallet se encarga de mostrar el botón de Mercado Pago */}
          {/* @ts-ignore */}
          <Wallet
            initialization={{ preferenceId: preferenceId, redirectMode: 'blank' }}
            onReady={() => console.log('✅ Wallet Brick cargado y listo')}
            onError={(error) => {
              console.error('❌ Wallet Brick Error:', error);
              setError(`Error en Wallet: ${JSON.stringify(error)}`);
            }}
            onSubmit={async () => {
              console.log('Pago iniciado');
            }}
          />
          <button
            onClick={() => setPreferenceId(null)}
            className="mt-4 text-sm text-gray-500 hover:underline"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
