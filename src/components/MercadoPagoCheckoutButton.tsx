import { useEffect, useState } from 'react'
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'
import { Button } from '@/components/ui/button'

export function MercadoPagoCheckoutButton({
  packId,
  className,
  onSuccess,
}: {
  packId: number
  className?: string
  onSuccess?: () => void
}) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Inicializar con Public Key
    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY
    if (publicKey) {
      initMercadoPago(publicKey, { locale: 'es-CO' }); // Ajustar locale según necesidad
    } else {
      console.error("Falta configurar VITE_MP_PUBLIC_KEY en el archivo .env")
      setError("Configuración incompleta")
    }
  }, [])

  const handleBuy = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/mercadopago/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      })

      if (!response.ok) {
        throw new Error('Error al crear la orden')
      }

      const data = await response.json()
      if (data.id) {
        setPreferenceId(data.id)
      } else {
        throw new Error('No se recibió ID de preferencia')
      }
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al iniciar el pago.')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <div className="text-red-500 text-xs">{error}</div>
  }

  if (preferenceId) {
    return (
      <div className={className}>
        <Wallet
          initialization={{ preferenceId: preferenceId }}
          onReady={() => console.log('Wallet Ready')}
          onError={(e) => console.error('Wallet Error', e)}
        />
        <button
          onClick={() => setPreferenceId(null)}
          className="mt-2 text-xs text-gray-500 hover:underline w-full text-center"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <Button
      onClick={handleBuy}
      disabled={loading}
      className={`w-full bg-blue-500 hover:bg-blue-600 text-white ${className}`}
    >
      {loading ? 'Cargando...' : 'Pagar con Mercado Pago'}
    </Button>
  )
}
