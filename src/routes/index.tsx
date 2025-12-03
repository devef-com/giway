import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CheckCircle2,
  Gift,
  Trophy,
  Users,
  Hash,
  Sparkles,
  Zap,
  ImageIcon,
  Mail,
  Play,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Main Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span>Raffles & Giveaways Made Simple</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Host Your <span className="text-primary">Giways</span> With Confidence
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          The complete platform for organizing raffles with number slots or
          simple giveaway drawings. Manage participants, track reservations, and
          pick winners fairly.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link to="/authentication/signup">Get Started Free</Link>
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

      {/* Event Types */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Two Ways to Run Your Event
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Choose between interactive raffles with number selection or simple
            giveaway drawings
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-full text-primary w-fit mb-2">
                  <Hash className="w-6 h-6" />
                </div>
                <CardTitle>Raffles (Play with Numbers)</CardTitle>
                <CardDescription>
                  Participants actively select number slots to compete for
                  prizes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Configurable number slots per event</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Reserve, release, and track slot status</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>System or manual winner selection</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Free (1 number) or Paid (multiple numbers)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-full text-primary w-fit mb-2">
                  <Gift className="w-6 h-6" />
                </div>
                <CardTitle>Giveaway Drawings</CardTitle>
                <CardDescription>
                  Simple entries without number selection — perfect for large
                  audiences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Very high participant limits</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>System-generated winner selection</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Quick setup, instant results</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Transparent and fair drawings</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Gift className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">1. Create a Giway</h3>
              <p className="text-muted-foreground">
                Set up your raffle or giveaway with prizes, number slots, and
                participation rules.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">2. Invite Participants</h3>
              <p className="text-muted-foreground">
                Share your event link. Participants reserve slots or enter the
                drawing.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">3. Pick Winners</h3>
              <p className="text-muted-foreground">
                Select winners manually or let the system choose fairly and
                transparently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Powerful Features
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Everything you need to run successful events
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Number Slot Management</h3>
                <p className="text-sm text-muted-foreground">
                  Track available, reserved, and taken slots with real-time
                  updates.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Participant History</h3>
                <p className="text-sm text-muted-foreground">
                  Keep track of all entries, even rejected participants with
                  number logs.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  Flexible Winner Selection
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose system-generated random selection or pick winners
                  manually.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Image Uploads</h3>
                <p className="text-sm text-muted-foreground">
                  Add images to showcase prizes and make your events more
                  engaging.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Email Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Notify participants and winners automatically via email.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Watch Ads for Credits</h3>
                <p className="text-sm text-muted-foreground">
                  Earn extra participants by watching ads for raffle-type
                  events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">Flexible Balance System</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started free with monthly rewards, or purchase packs for larger
            events
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card className="border-green-500/30">
              <CardHeader>
                <div className="p-2 bg-green-500/10 rounded-full text-green-500 w-fit mx-auto mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">Monthly Free</CardTitle>
                <CardDescription>For active users every month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-left text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>200 participants</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>1 image upload</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Raffles only (play with numbers)</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  Resets monthly • Does not accumulate
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/30 shadow-lg scale-105">
              <CardHeader>
                <div className="p-2 bg-primary/10 rounded-full text-primary w-fit mx-auto mb-2">
                  <Gift className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">Purchase Packs</CardTitle>
                <CardDescription>
                  For larger events and giveaways
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-left text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Higher participant limits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>More image uploads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Email notifications included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Never expires</span>
                  </li>
                </ul>
                <Button className="w-full mt-4" asChild>
                  <Link to="/store">View Packs</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30">
              <CardHeader>
                <div className="p-2 bg-blue-500/10 rounded-full text-blue-500 w-fit mx-auto mb-2">
                  <Play className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">Watch Ads</CardTitle>
                <CardDescription>
                  Earn bonus credits for raffles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-left text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>+10 participants per ad</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Raffles only</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Quick and easy</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  Available in the app when creating events
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">
            Ready to Host Your First Giway?
          </h2>
          <p className="text-muted-foreground text-lg">
            Join now and get 200 free participants every month to run your
            raffles.
          </p>
          <Button size="lg" asChild>
            <Link to="/authentication/signup">Get Started Free</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
