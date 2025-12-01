import GooglePayButtonLib from '@google-pay/button-react'
import type { GooglePayPaymentData } from '@/hooks/useGooglePay'

interface GooglePayButtonProps {
  totalPriceCents: number
  onPaymentSuccess?: (paymentData: GooglePayPaymentData) => void | Promise<void>
  onPaymentError?: (error: Error) => void
  disabled?: boolean
  className?: string
  countryCode?: string
  currencyCode?: string
  merchantName?: string
  merchantId?: string // required in PRODUCTION
}

export function GooglePayButton({
  totalPriceCents,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className = '',
  countryCode = 'US',
  currencyCode = 'USD',
  merchantName = 'Giway Store',
  merchantId,
}: GooglePayButtonProps) {
  const totalPrice = (totalPriceCents / 100).toFixed(2)

  const paymentRequest = {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [
      {
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: [
            'AMEX',
            'DISCOVER',
            'INTERAC',
            'JCB',
            'MASTERCARD',
            'VISA',
          ],
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'stripe',
            gatewayMerchantId: 'BCR2DN5TRDL6FJT7',
            'stripe:version': '2018-10-31',
            'stripe:publishableKey':
              'pk_test_51SZNlhBTJCtQWQ6w7iagMO48WVKWQA5eHVn0ua7bbfKcgxhoPdwwjuZpVyYBJk1ErvChNU88s2oVforuK6TWPTnl00JZDZbxdp',
          },
        },
      },
    ],
    merchantInfo: {
      merchantName,
      ...(merchantId ? { merchantId } : {}),
    },
    transactionInfo: {
      totalPriceStatus: 'FINAL',
      totalPrice,
      currencyCode,
      countryCode,
    },
  }

  // The library component doesn't expose a disabled prop; emulate it
  const containerStyle: React.CSSProperties = disabled
    ? { pointerEvents: 'none', opacity: 0.6 }
    : {}

  return (
    <div className={className} style={containerStyle}>
      <GooglePayButtonLib
        environment="TEST"
        buttonColor="black"
        buttonType="buy"
        buttonSizeMode="fill"
        paymentRequest={paymentRequest as any}
        onLoadPaymentData={async (paymentData: any) => {
          try {
            await onPaymentSuccess?.(paymentData as GooglePayPaymentData)
          } catch (err) {
            onPaymentError?.(err as Error)
          }
        }}
        onError={(err) => {
          onPaymentError?.(err as unknown as Error)
        }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
