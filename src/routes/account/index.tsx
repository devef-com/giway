import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { useUserBalance } from '@/querys/useUserBalance'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Coins,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/account/')({
  component: RouteComponent,
})

function RouteComponent() {
  const session = authClient.useSession()
  const { data: balance, isLoading: balanceLoading } = useUserBalance()
  const navigate = useNavigate()

  const signOut = () => {
    authClient.signOut().then(() => {
      navigate({ to: '/authentication/login' })
    })
  }

  if (session.isPending) {
    return (
      <div className="min-h-[calc(100svh-128px)] p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (session.error) {
    return (
      <div className="min-h-[calc(100svh-128px)] p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                Error loading account information. Please try again.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!session.data) {
    return (
      <div className="min-h-[calc(100svh-128px)] p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                No session found. Please log in to view your account.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const user = session.data.user

  return (
    <div className="min-h-[calc(100svh-128px)] p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex gap-2 justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account</h1>
            <p className="text-muted-foreground">
              Manage your account settings and view your information.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={signOut}>
            <LogOut />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your personal account details and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-muted-foreground">{user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              {user.emailVerified ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString(
                    navigator.language,
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    },
                  )}
                </p>
              </div>
            </div>

            {user.image && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Profile Picture</p>
                  <img
                    src={user.image}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Account Balance
            </CardTitle>
            <CardDescription>
              Your current balance for different types of drawings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : balance ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    Raffles (Play with Numbers)
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Participants: {balance.playWithNumbers.participants}</p>
                    <p>Images: {balance.playWithNumbers.images}</p>
                    <p>Emails: {balance.playWithNumbers.emails}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    Giveaways (No Numbers)
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Participants: {balance.noNumbers.participants}</p>
                    <p>Images: {balance.noNumbers.images}</p>
                    <p>Emails: {balance.noNumbers.emails}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Unable to load balance information.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
