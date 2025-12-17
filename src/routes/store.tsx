import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Image, Mail, Package, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PayPalCheckoutButton } from '@/components/PayPalCheckoutButton'
import { usePacks } from '@/querys/usePacks'
import { useUserBalance } from '@/querys/useUserBalance'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/store')({
  component: StorePage,
})

function StorePage() {
  const session = authClient.useSession()
  const { data: packs, isLoading: isPacksLoading } = usePacks()
  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch,
  } = useUserBalance(!!session.data)
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null)

  // Group packs by type
  const rafflesPacks =
    packs?.filter((p) => p.giwayType === 'play_with_numbers') ?? []
  const giveawayPacks = packs?.filter((p) => p.giwayType === 'no_numbers') ?? []

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const onSuccess = () => {
    toast.success('Pack purchased successfully!')
    refetch()
    setSelectedPackId(null)
  }

  if (!session.data) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6">
            <p className="text-center">
              Please{' '}
              <Link
                to="/authentication/login"
                className="text-primary hover:underline"
              >
                log in
              </Link>{' '}
              to view the store.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Store</h1>
            <p className="text-muted-foreground">
              Get packs to create more giways
            </p>
          </div>
          <Link to="/drawings/create">
            <Button>Create Giway</Button>
          </Link>
        </div>

        {/* Current Balance */}
        {!isBalanceLoading && balance && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Your Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="font-medium mb-2">
                    Raffles (Play with Numbers)
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {balance.playWithNumbers.participants} participants
                    </span>
                    <span className="flex items-center gap-1">
                      <Image className="h-4 w-4" />
                      {balance.playWithNumbers.images} images
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {balance.playWithNumbers.emails} emails
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="font-medium mb-2">Giveaways (No Numbers)</p>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {balance.noNumbers.participants} participants
                    </span>
                    <span className="flex items-center gap-1">
                      <Image className="h-4 w-4" />
                      {balance.noNumbers.images} images
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {balance.noNumbers.emails} emails
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isPacksLoading ? (
          <Card className="p-6">
            <p className="text-center">Loading packs...</p>
          </Card>
        ) : packs && packs.length > 0 ? (
          <>
            {/* Raffles Packs */}
            {rafflesPacks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                  Raffle Packs (Play with Numbers)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rafflesPacks.map((pack) => (
                    <Card key={pack.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          {pack.name}
                        </CardTitle>
                        <CardDescription>
                          For raffles where participants pick numbers
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-primary" />
                            <span>
                              {pack.participants.toLocaleString()} participants
                            </span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Image className="h-4 w-4 text-primary" />
                            <span>{pack.images} images</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-primary" />
                            <span>{pack.emails.toLocaleString()} emails</span>
                          </li>
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <div className="w-full space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">
                              {formatPrice(pack.price)}
                            </span>
                            <Button
                              variant="outline"
                              onClick={() =>
                                setSelectedPackId(
                                  selectedPackId === pack.id ? null : pack.id,
                                )
                              }
                            >
                              {selectedPackId === pack.id
                                ? 'Cancel'
                                : 'Buy Pack'}
                            </Button>
                          </div>
                          {selectedPackId === pack.id && session.data?.user && (
                            <PayPalCheckoutButton
                              packId={pack.id}
                              className="w-full"
                              onSuccess={onSuccess}
                            />
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Giveaway Packs */}
            {giveawayPacks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                  Giveaway Packs (No Numbers)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {giveawayPacks.map((pack) => (
                    <Card key={pack.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          {pack.name}
                        </CardTitle>
                        <CardDescription>
                          For giveaways with random winner selection
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-primary" />
                            <span>
                              {pack.participants.toLocaleString()} participants
                            </span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Image className="h-4 w-4 text-primary" />
                            <span>{pack.images} images</span>
                          </li>
                          {pack.emails > 0 && (
                            <li className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-primary" />
                              <span>{pack.emails.toLocaleString()} emails</span>
                            </li>
                          )}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <div className="w-full space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">
                              {formatPrice(pack.price)}
                            </span>
                            <Button
                              variant="outline"
                              onClick={() =>
                                setSelectedPackId(
                                  selectedPackId === pack.id ? null : pack.id,
                                )
                              }
                            >
                              {selectedPackId === pack.id
                                ? 'Cancel'
                                : 'Buy Pack'}
                            </Button>
                          </div>
                          {selectedPackId === pack.id && session.data?.user && (
                            <PayPalCheckoutButton
                              packId={pack.id}
                              className="w-full"
                              onSuccess={onSuccess}
                            />
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              No packs available at the moment. Check back later!
            </p>
          </Card>
        )}

        {/* Monthly Free Info */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Monthly Free Allowance</CardTitle>
            <CardDescription>
              Active users receive free resources each month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                100 participants (Raffle only)
              </span>
              <span className="flex items-center gap-1">
                <Image className="h-4 w-4" />1 image
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Monthly allowances expire at the end of each month and cannot be
              accumulated.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
