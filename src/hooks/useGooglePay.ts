import { useEffect, useState, useCallback, useRef } from 'react'

// Exported types for Google Pay API
export interface GooglePayPaymentData {
  apiVersion: number
  apiVersionMinor: number
  paymentMethodData: {
    type: string
    description: string
    info: {
      cardNetwork: string
      cardDetails: string
    }
    tokenizationData: {
      type: string
      token: string
    }
  }
}

// Types for Google Pay API
declare global {
  interface Window {
    google?: {
      payments: {
        api: {
          PaymentsClient: new (config: PaymentsClientConfig) => PaymentsClient
        }
      }
    }
  }
}

interface PaymentsClientConfig {
  environment: 'TEST' | 'PRODUCTION'
  paymentDataCallbacks?: {
    onPaymentAuthorized?: (
      paymentData: google.payments.api.PaymentData,
    ) => Promise<google.payments.api.PaymentAuthorizationResult>
  }
}

interface PaymentsClient {
  isReadyToPay: (
    request: google.payments.api.IsReadyToPayRequest,
  ) => Promise<google.payments.api.IsReadyToPayResponse>
  createButton: (options: google.payments.api.ButtonOptions) => HTMLElement
  loadPaymentData: (
    request: google.payments.api.PaymentDataRequest,
  ) => Promise<google.payments.api.PaymentData>
  prefetchPaymentData: (request: google.payments.api.PaymentDataRequest) => void
}

// Extend google.payments.api namespace
declare namespace google.payments.api {
  interface IsReadyToPayRequest {
    apiVersion: number
    apiVersionMinor: number
    allowedPaymentMethods: PaymentMethod[]
  }

  interface IsReadyToPayResponse {
    result: boolean
  }

  interface PaymentDataRequest {
    apiVersion: number
    apiVersionMinor: number
    allowedPaymentMethods: PaymentMethod[]
    transactionInfo: TransactionInfo
    merchantInfo: MerchantInfo
  }

  interface PaymentMethod {
    type: string
    parameters: CardParameters
    tokenizationSpecification?: TokenizationSpecification
  }

  interface CardParameters {
    allowedAuthMethods: string[]
    allowedCardNetworks: string[]
  }

  interface TokenizationSpecification {
    type: string
    parameters: {
      gateway: string
      gatewayMerchantId: string
    }
  }

  interface TransactionInfo {
    countryCode: string
    currencyCode: string
    totalPriceStatus: string
    totalPrice: string
    displayItems?: DisplayItem[]
  }

  interface DisplayItem {
    label: string
    type: string
    price: string
  }

  interface MerchantInfo {
    merchantId?: string
    merchantName: string
  }

  interface PaymentData {
    apiVersion: number
    apiVersionMinor: number
    paymentMethodData: PaymentMethodData
  }

  interface PaymentMethodData {
    type: string
    description: string
    info: CardInfo
    tokenizationData: TokenizationData
  }

  interface CardInfo {
    cardNetwork: string
    cardDetails: string
  }

  interface TokenizationData {
    type: string
    token: string
  }

  interface ButtonOptions {
    onClick: () => void
    allowedPaymentMethods: PaymentMethod[]
    buttonColor?: 'default' | 'black' | 'white'
    buttonType?:
      | 'buy'
      | 'book'
      | 'checkout'
      | 'donate'
      | 'order'
      | 'pay'
      | 'plain'
      | 'subscribe'
    buttonSizeMode?: 'static' | 'fill'
    buttonLocale?: string
  }

  interface PaymentAuthorizationResult {
    transactionState: 'SUCCESS' | 'ERROR'
    error?: {
      intent: string
      message: string
      reason: string
    }
  }
}

// Configuration
const GOOGLE_PAY_SCRIPT_URL = 'https://pay.google.com/gp/p/js/pay.js'

const baseRequest = {
  apiVersion: 2,
  apiVersionMinor: 0,
}

const allowedCardNetworks = [
  'AMEX',
  'DISCOVER',
  'INTERAC',
  'JCB',
  'MASTERCARD',
  'VISA',
]

const allowedCardAuthMethods = ['PAN_ONLY', 'CRYPTOGRAM_3DS']

// TODO: Replace with your actual gateway configuration
const tokenizationSpecification: google.payments.api.TokenizationSpecification =
  {
    type: 'PAYMENT_GATEWAY',
    parameters: {
      gateway: 'stripe', // Replace with your payment gateway (e.g., 'stripe', 'braintree')
      gatewayMerchantId: 'BCR2DN5TRDL6FJT7', // Replace with your merchant ID
      //@ts-ignore
      'stripe:version': '2018-10-31',
      'stripe:publishableKey':
        'pk_test_51SZNlhBTJCtQWQ6w7iagMO48WVKWQA5eHVn0ua7bbfKcgxhoPdwwjuZpVyYBJk1ErvChNU88s2oVforuK6TWPTnl00JZDZbxdp',
    },
  }

const baseCardPaymentMethod: google.payments.api.PaymentMethod = {
  type: 'CARD',
  parameters: {
    allowedAuthMethods: allowedCardAuthMethods,
    allowedCardNetworks: allowedCardNetworks,
  },
}

const cardPaymentMethod: google.payments.api.PaymentMethod = {
  ...baseCardPaymentMethod,
  tokenizationSpecification: tokenizationSpecification,
}

export interface UseGooglePayOptions {
  environment?: 'TEST' | 'PRODUCTION'
  merchantName?: string
  merchantId?: string
  countryCode?: string
  currencyCode?: string
  onPaymentSuccess?: (
    paymentData: google.payments.api.PaymentData,
  ) => void | Promise<void>
  onPaymentError?: (error: Error) => void
}

export interface GooglePayState {
  isReady: boolean
  isLoading: boolean
  error: Error | null
}

export function useGooglePay(options: UseGooglePayOptions = {}) {
  const {
    environment = 'TEST',
    merchantName = 'Giway Store',
    merchantId,
    countryCode = 'US',
    currencyCode = 'USD',
    onPaymentSuccess,
    onPaymentError,
  } = options

  const [state, setState] = useState<GooglePayState>({
    isReady: false,
    isLoading: true,
    error: null,
  })

  const paymentsClientRef = useRef<PaymentsClient | null>(null)
  const scriptLoadedRef = useRef(false)

  // Load the Google Pay script
  const loadScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (scriptLoadedRef.current && window.google?.payments) {
        resolve()
        return
      }

      const existingScript = document.querySelector(
        `script[src="${GOOGLE_PAY_SCRIPT_URL}"]`,
      )

      if (existingScript) {
        existingScript.addEventListener('load', () => {
          scriptLoadedRef.current = true
          resolve()
        })
        existingScript.addEventListener('error', () => {
          reject(new Error('Failed to load Google Pay script'))
        })
        return
      }

      const script = document.createElement('script')
      script.src = GOOGLE_PAY_SCRIPT_URL
      script.async = true
      script.onload = () => {
        scriptLoadedRef.current = true
        resolve()
      }
      script.onerror = () => {
        reject(new Error('Failed to load Google Pay script'))
      }
      document.head.appendChild(script)
    })
  }, [])

  // Get PaymentsClient instance
  const getPaymentsClient = useCallback((): PaymentsClient | null => {
    if (!window.google?.payments) {
      return null
    }

    if (!paymentsClientRef.current) {
      paymentsClientRef.current = new window.google.payments.api.PaymentsClient(
        {
          environment,
        },
      )
    }

    return paymentsClientRef.current
  }, [environment])

  // Check if Google Pay is ready
  const checkIsReadyToPay = useCallback(async (): Promise<boolean> => {
    const client = getPaymentsClient()
    if (!client) return false

    try {
      const response = await client.isReadyToPay({
        ...baseRequest,
        allowedPaymentMethods: [baseCardPaymentMethod],
      })
      return response.result
    } catch (error) {
      console.error('Error checking Google Pay readiness:', error)
      return false
    }
  }, [getPaymentsClient])

  // Initialize Google Pay
  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        await loadScript()

        if (!mounted) return

        const isReady = await checkIsReadyToPay()

        if (mounted) {
          setState({
            isReady,
            isLoading: false,
            error: isReady ? null : new Error('Google Pay is not available'),
          })
        }
      } catch (error) {
        if (mounted) {
          setState({
            isReady: false,
            isLoading: false,
            error:
              error instanceof Error
                ? error
                : new Error('Failed to initialize Google Pay'),
          })
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [loadScript, checkIsReadyToPay])

  // Get payment data request
  const getPaymentDataRequest = useCallback(
    (totalPrice: string): google.payments.api.PaymentDataRequest => {
      return {
        ...baseRequest,
        allowedPaymentMethods: [cardPaymentMethod],
        transactionInfo: {
          countryCode,
          currencyCode,
          totalPriceStatus: 'FINAL',
          totalPrice,
        },
        merchantInfo: {
          ...(merchantId && environment === 'PRODUCTION' ? { merchantId } : {}),
          merchantName,
        },
      }
    },
    [countryCode, currencyCode, merchantId, merchantName, environment],
  )

  // Process payment
  const processPayment = useCallback(
    async (
      totalPriceCents: number,
    ): Promise<google.payments.api.PaymentData | null> => {
      const client = getPaymentsClient()
      if (!client) {
        const error = new Error('Google Pay client not initialized')
        onPaymentError?.(error)
        return null
      }

      const totalPrice = (totalPriceCents / 100).toFixed(2)

      try {
        const paymentData = await client.loadPaymentData(
          getPaymentDataRequest(totalPrice),
        )

        await onPaymentSuccess?.(paymentData)
        return paymentData
      } catch (error) {
        // User cancelled or error occurred
        if (error instanceof Error) {
          // Don't report user cancellation as error
          if (!error.message?.includes('CANCELED')) {
            onPaymentError?.(error)
          }
        }
        return null
      }
    },
    [
      getPaymentsClient,
      getPaymentDataRequest,
      onPaymentSuccess,
      onPaymentError,
    ],
  )

  // Create Google Pay button
  const createButton = useCallback(
    (
      onClick: () => void,
      buttonOptions?: Partial<google.payments.api.ButtonOptions>,
    ): HTMLElement | null => {
      const client = getPaymentsClient()
      if (!client || !state.isReady) return null

      return client.createButton({
        onClick,
        allowedPaymentMethods: [baseCardPaymentMethod],
        buttonColor: 'black',
        buttonType: 'buy',
        buttonSizeMode: 'fill',
        ...buttonOptions,
      })
    },
    [getPaymentsClient, state.isReady],
  )

  return {
    ...state,
    processPayment,
    createButton,
  }
}
