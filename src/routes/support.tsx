import { createFileRoute } from '@tanstack/react-router'
import {
  Expandable,
  ExpandableContent,
  ExpandableTitle,
} from '@/components/ui/expandable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/support')({
  component: SupportPage,
})

function SupportPage() {
  return (
    <div>
      <main className="container mx-auto py-10 px-4 max-w-3xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Support & FAQ</h1>
            <p className="text-muted-foreground text-lg">
              Find answers to common questions about Giway.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Expandable className="border rounded-md">
                <ExpandableTitle>What is a Giway?</ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    A Giway is an event on our platform. It can be a Raffle
                    (where participants pick numbers) or a Giveaway Drawing
                    (where winners are picked randomly without number
                    selection).
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>
                  What is the difference between Free and Paid events?
                </ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    In Free events, participants can only select one number. In
                    Paid events, the host sets a price, and participants can
                    select multiple numbers.
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>
                  How does "Play with Numbers" work?
                </ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    When "Play with Numbers" is enabled (Raffle), participants
                    actively select numbers. If disabled, the system
                    automatically assigns winners.
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>
                  How do I get more participants for my Giway?
                </ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    You can increase your participant limit by purchasing Packs,
                    redeeming coupons, or watching ads (for Raffle Giways).
                    Every month, active users also get free rewards (200
                    participants for Raffles).
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>
                  What happens if I reject a participant?
                </ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    If you reject a participant, their reserved number slots are
                    released. However, we keep a record of the numbers they had
                    selected in case you need to reference them later.
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>Do my purchased packs expire?</ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    No, purchased packs and redeemed coupons never expire. Only
                    the monthly active-user rewards expire at the end of each
                    month.
                  </p>
                </ExpandableContent>
              </Expandable>
            </CardContent>
          </Card>

          <div className="text-center space-y-4 pt-8">
            <h2 className="text-2xl font-semibold">Still have questions?</h2>
            <p className="text-muted-foreground">
              We are here to help. Contact our support team for further
              assistance.
            </p>
            {/* Placeholder for contact button or email */}
            <a
              href="mailto:support@giway.com"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Contact Support
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
