import { Button } from '@/components/ui/button'

interface PolarCheckoutButtonProps {
  productId: string // Polar product ID (from pack.polarId)
  userId: string // User ID for webhook processing
  customerEmail?: string
  customerName?: string
  className?: string
}

export function PolarCheckoutButton({
  productId,
  userId,
  customerEmail,
  customerName,
  className,
}: PolarCheckoutButtonProps) {
  // Build checkout URL with query params
  // The /api/checkout route handles the redirect to Polar
  const buildCheckoutUrl = () => {
    const params = new URLSearchParams()
    params.set('products', productId)

    // Pass userId in metadata - webhook looks up pack via Polar product ID
    const metadata = JSON.stringify({ userId })
    params.set('metadata', metadata)

    if (customerEmail) params.set('customerEmail', customerEmail)
    if (customerName) params.set('customerName', customerName)

    return `/api/checkout?${params.toString()}`
  }

  return (
    <Button asChild className={className}>
      <a href={buildCheckoutUrl()}>Buy with Polar</a>
    </Button>
  )
}
