import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
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
  ChevronLeft,
  ChevronRight,
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
import { m } from '@/lang'
import { useLanguage } from '@/lib/i18n'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function GiwayNumbersPreview() {
  const TOTAL_NUMBERS = 640
  const NUMBERS_PER_PAGE = 6 * 17 // mirrors the real grid paging
  const PREVIEW_CELLS = 6 * 5 // smaller, landing-friendly preview

  const totalPages = Math.ceil(TOTAL_NUMBERS / NUMBERS_PER_PAGE)
  const [pageIndex, setPageIndex] = useState(
    +(TOTAL_NUMBERS / NUMBERS_PER_PAGE).toFixed(),
  )

  const pageStart = pageIndex * NUMBERS_PER_PAGE + 1
  const pageEnd = Math.min(pageStart + NUMBERS_PER_PAGE - 1, TOTAL_NUMBERS)

  const numbersToShow = useMemo(() => {
    const count = Math.min(PREVIEW_CELLS, pageEnd - pageStart + 1)
    return Array.from({ length: count }, (_unused, i) => pageStart + i)
  }, [pageStart, pageEnd])

  const selected = useMemo(() => new Set([pageStart + 4]), [pageStart])
  const reserved = useMemo(
    () => new Set([pageStart + 12, pageStart + 20]),
    [pageStart],
  )
  const taken = useMemo(
    () => new Set([pageStart + 1, pageStart + 8]),
    [pageStart],
  )

  const ghostCount = Math.max(0, PREVIEW_CELLS - numbersToShow.length)

  return (
    <Card className="h-full w-full overflow-hidden border-primary/20 shadow-2xl">
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="text-left">
            <div className="text-sm text-muted-foreground">
              {m.app_title()} preview
            </div>
            <div className="text-xl font-semibold tracking-tight">
              AirPods 4 Gen
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tracking-tight">
              {TOTAL_NUMBERS}
            </div>
            <div className="text-xs text-muted-foreground">
              {m.landing_preview_available()}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-6 gap-2 flex-1">
          {numbersToShow.map((n) => {
            const isSelected = selected.has(n)
            const isTaken = taken.has(n)
            const isReserved = reserved.has(n)

            const base =
              'aspect-square w-full rounded-lg border flex items-center justify-center text-base md:text-xl font-medium transition-colors'
            const stateClass = isSelected
              ? 'bg-primary text-primary-foreground border-primary'
              : isTaken
                ? 'bg-muted text-muted-foreground border-muted'
                : isReserved
                  ? 'bg-primary/10 text-foreground border-primary/20'
                  : 'bg-background text-foreground border-border'

            return (
              <div key={n} className={`${base} ${stateClass}`} aria-hidden>
                {isTaken ? '' : n}
              </div>
            )
          })}

          {ghostCount > 0 &&
            Array.from({ length: ghostCount }, (_unused, i) => (
              <div
                key={`ghost-${pageIndex}-${i}`}
                aria-hidden
                className="aspect-square w-full rounded-lg border border-border bg-transparent"
              />
            ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {m.landing_preview_showing({
              start: pageStart.toString(),
              end: pageEnd.toString(),
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border bg-background text-foreground disabled:opacity-50"
              aria-label={m.landing_preview_previous()}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-2">
              {Array.from({ length: totalPages }, (_unused, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPageIndex(i)}
                  className={
                    i === pageIndex
                      ? 'h-2.5 w-2.5 rounded-full bg-primary'
                      : 'h-2 w-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }
                  aria-label={m.landing_preview_goToPage({
                    page: (i + 1).toString(),
                  })}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setPageIndex((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={pageIndex >= totalPages - 1}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border bg-background text-foreground disabled:opacity-50"
              aria-label={m.landing_preview_next()}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function LandingPage() {
  const { locale } = useLanguage() // Context subscription triggers re-render on locale change
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Main Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span>{m.landing_badge()}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          {m.landing_title({ giway: m.app_title() })}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          {m.landing_subtitle()}
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link to="/authentication/signup">{m.landing_cta_getStarted()}</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/authentication/login">{m.landing_cta_login()}</Link>
          </Button>
        </div>

        {/* Giway Preview */}
        <div className="w-full max-w-4xl mt-8">
          <GiwayNumbersPreview />
        </div>
      </section>

      {/* Event Types */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {m.landing_eventTypes_title()}
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            {m.landing_eventTypes_subtitle()}
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-full text-primary w-fit mb-2">
                  <Hash className="w-6 h-6" />
                </div>
                <CardTitle>{m.landing_eventTypes_raffles_title()}</CardTitle>
                <CardDescription>
                  {m.landing_eventTypes_raffles_description()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{m.landing_eventTypes_raffles_feature1()}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{m.landing_eventTypes_raffles_feature2()}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{m.landing_eventTypes_raffles_feature3()}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{m.landing_eventTypes_raffles_feature4()}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-full text-primary w-fit mb-2">
                  <Gift className="w-6 h-6" />
                </div>
                <CardTitle>{m.landing_eventTypes_giveaway_title()}</CardTitle>
                <CardDescription>
                  {m.landing_eventTypes_giveaway_description()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{m.landing_eventTypes_giveaway_feature1()}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{m.landing_eventTypes_giveaway_feature2()}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{m.landing_eventTypes_giveaway_feature3()}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{m.landing_eventTypes_giveaway_feature4()}</span>
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
          <h2 className="text-3xl font-bold text-center mb-12">{m.landing_howItWorks_title()}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Gift className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">{m.landing_howItWorks_step1_title()}</h3>
              <p className="text-muted-foreground">
                {m.landing_howItWorks_step1_description()}
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">{m.landing_howItWorks_step2_title()}</h3>
              <p className="text-muted-foreground">
                {m.landing_howItWorks_step2_description()}
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">{m.landing_howItWorks_step3_title()}</h3>
              <p className="text-muted-foreground">
                {m.landing_howItWorks_step3_description()}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {m.landing_features_title()}
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            {m.landing_features_subtitle()}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{m.landing_features_numberSlots_title()}</h3>
                <p className="text-sm text-muted-foreground">
                  {m.landing_features_numberSlots_description()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{m.landing_features_participantHistory_title()}</h3>
                <p className="text-sm text-muted-foreground">
                  {m.landing_features_participantHistory_description()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  {m.landing_features_winnerSelection_title()}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {m.landing_features_winnerSelection_description()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{m.landing_features_imageUploads_title()}</h3>
                <p className="text-sm text-muted-foreground">
                  {m.landing_features_imageUploads_description()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{m.landing_features_emailNotifications_title()}</h3>
                <p className="text-sm text-muted-foreground">
                  {m.landing_features_emailNotifications_description()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{m.landing_features_watchAds_title()}</h3>
                <p className="text-sm text-muted-foreground">
                  {m.landing_features_watchAds_description()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">{m.landing_pricing_title()}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {m.landing_pricing_subtitle()}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card className="border-green-500/30">
              <CardHeader>
                <div className="p-2 bg-green-500/10 rounded-full text-green-500 w-fit mx-auto mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">{m.landing_pricing_monthlyFree_title()}</CardTitle>
                <CardDescription>{m.landing_pricing_monthlyFree_description()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-left text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_monthlyFree_feature1()}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_monthlyFree_feature2()}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_monthlyFree_feature3()}</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  {m.landing_pricing_monthlyFree_note()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/30 shadow-lg scale-105">
              <CardHeader>
                <div className="p-2 bg-primary/10 rounded-full text-primary w-fit mx-auto mb-2">
                  <Gift className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">{m.landing_pricing_purchasePacks_title()}</CardTitle>
                <CardDescription>
                  {m.landing_pricing_purchasePacks_description()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-left text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_purchasePacks_feature1()}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_purchasePacks_feature2()}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_purchasePacks_feature3()}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_purchasePacks_feature4()}</span>
                  </li>
                </ul>
                {/* <Button className="w-full mt-4" asChild>
                  <Link to="/store">View Packs</Link>
                </Button> */}
              </CardContent>
            </Card>

            <Card className="border-blue-500/30">
              <CardHeader>
                <div className="p-2 bg-blue-500/10 rounded-full text-blue-500 w-fit mx-auto mb-2">
                  <Play className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">{m.landing_pricing_watchAds_title()}</CardTitle>
                <CardDescription>
                  {m.landing_pricing_watchAds_description()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-left text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_watchAds_feature1()}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_watchAds_feature2()}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{m.landing_pricing_watchAds_feature3()}</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  {m.landing_pricing_watchAds_note()}
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
            {m.landing_cta_title()}
          </h2>
          <p className="text-muted-foreground text-lg">
            {m.landing_cta_subtitle()}
          </p>
          <Button size="lg" asChild>
            <Link to="/authentication/signup">{m.landing_cta_button()}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
