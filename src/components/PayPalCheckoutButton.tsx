//https://docs.paypal.ai/payments/methods/paypal/sdk/js/v6/paypal-checkout
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

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
        reject(new Error('PAYPAL_SDK_FAILED_TO_LOAD')),
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
    script.onerror = () => reject(new Error('PAYPAL_SDK_FAILED_TO_LOAD'))

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
  const { t } = useTranslation()
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
          throw new Error('PAYPAL_SDK_NOT_AVAILABLE')
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
                throw new Error(text || 'PAYPAL_FAILED_TO_CREATE_ORDER')
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
                throw new Error(text || 'PAYPAL_FAILED_TO_CAPTURE_ORDER')
              }

              onSuccess?.()
            },

            onError: (err: any) => {
              console.error('PayPal button error:', err)
              setError(t('checkout.paypal.checkoutFailed'))
            },
          })
          .render(containerRef.current)

        renderedForPackRef.current = packId
      } catch (e: any) {
        console.error(e)
        const code = String(e?.message || '')
        if (
          code === 'PAYPAL_SDK_FAILED_TO_LOAD' ||
          code === 'PAYPAL_SDK_NOT_AVAILABLE'
        ) {
          setError(t('checkout.paypal.loadFailed'))
        } else {
          // Keep server responses (if any), otherwise fall back to a friendly, translated message
          setError(code && !code.startsWith('PAYPAL_') ? code : t('checkout.paypal.loadFailed'))
        }
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
          {t('checkout.paypal.notConfigured')}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t('checkout.paypal.setClientId')}
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div ref={containerRef} />
      {isLoading && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t('checkout.paypal.loading')}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive text-center mt-2">{error}</p>
      )}
    </div>
  )
}
