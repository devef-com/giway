//https://docs.paypal.ai/payments/methods/paypal/sdk/js/v6/paypal-checkout
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    paypal?: any
  }
}

function loadPayPalSdk(clientId: string, currency: string) {
  const scriptId = 'paypal-js-sdk'
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null

  if (existing) {
    return new Promise<void>((resolve, reject) => {
      if (window.paypal) return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('PayPal SDK failed to load')),
      )
    })
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = scriptId
    script.async = true
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId,
    )}&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons`

    script.onload = () => resolve()
    script.onerror = () => reject(new Error('PayPal SDK failed to load'))

    document.body.appendChild(script)
  })
}

export function PayPalCheckoutButton({
  packId,
  className,
  onSuccess,
}: {
  packId: number
  className?: string
  onSuccess?: () => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const renderedForPackRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const clientId = useMemo(() => {
    return (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID as string | undefined
  }, [])

  useEffect(() => {
    let cancelled = false

    async function render() {
      setError(null)

      if (!clientId) {
        setError('Missing VITE_PAYPAL_CLIENT_ID')
        return
      }

      if (!containerRef.current) return

      // Re-render when pack changes
      if (
        renderedForPackRef.current === packId &&
        containerRef.current.childNodes.length > 0
      ) {
        return
      }

      containerRef.current.innerHTML = ''
      renderedForPackRef.current = null

      try {
        setIsLoading(true)
        await loadPayPalSdk(clientId, 'USD')

        if (cancelled) return
        if (!window.paypal?.Buttons) {
          throw new Error('PayPal SDK not available')
        }

        window.paypal
          .Buttons({
            createOrder: async () => {
              const res = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packId }),
              })

              if (!res.ok) {
                const text = await res.text().catch(() => '')
                throw new Error(text || 'Failed to create order')
              }

              const data = (await res.json()) as { orderId: string }
              return data.orderId
            },

            onApprove: async (data: any) => {
              const res = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: data.orderID }),
              })

              if (!res.ok) {
                const text = await res.text().catch(() => '')
                throw new Error(text || 'Failed to capture order')
              }

              onSuccess?.()
            },

            onError: (err: any) => {
              console.error('PayPal button error:', err)
              setError('PayPal checkout failed. Please try again.')
            },
          })
          .render(containerRef.current)

        renderedForPackRef.current = packId
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Failed to load PayPal')
      } finally {
        setIsLoading(false)
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [clientId, packId, onSuccess])

  if (!clientId) {
    return (
      <div className={className}>
        <Button variant="outline" disabled className="w-full">
          PayPal not configured
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Set VITE_PAYPAL_CLIENT_ID
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div ref={containerRef} />
      {isLoading && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Loading PayPal…
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive text-center mt-2">{error}</p>
      )}
    </div>
  )
}
