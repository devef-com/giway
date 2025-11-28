import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CheckCircle2, Gift, Trophy, Users } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Main Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Manage Your Giveaways{' '}
          <span className="text-primary">Effortlessly</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          The easiest way to organize drawings, track participants, and select
          winners fairly.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link to="/authentication/signup">Get Started</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/authentication/login">Login</Link>
          </Button>
        </div>

        {/* Image Placeholder */}
        <div className="w-full max-w-4xl aspect-video bg-muted rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center relative overflow-hidden shadow-2xl mt-8">
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <span className="text-lg font-medium">
              Application Screenshot Placeholder
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Gift className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">1. Create a Drawing</h3>
              <p className="text-muted-foreground">
                Set up your giveaway details, prizes, and rules in seconds.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">2. Add Participants</h3>
              <p className="text-muted-foreground">
                Easily manage entries and track who is participating.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">3. Pick Winners</h3>
              <p className="text-muted-foreground">
                Randomly select winners with our fair and transparent tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">Simple Pricing</h2>
          <p className="text-xl text-muted-foreground">
            Buy what you need, not subscriptions for now.
          </p>

          <Card className="max-w-md mx-auto border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Pay As You Go</CardTitle>
              <CardDescription>
                Perfect for occasional giveaways
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">
                $1{' '}
                <span className="text-lg font-normal text-muted-foreground">
                  / drawing
                </span>
              </div>
              <ul className="space-y-2 text-left max-w-xs mx-auto pt-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Unlimited participants</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Fair winner selection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Export results</span>
                </li>
              </ul>
              <Button className="w-full mt-6">Purchase Credits</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
