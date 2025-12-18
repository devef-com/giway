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
import { Trans, useTranslation } from 'react-i18next'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function GiwayNumbersPreview() {
  const { t } = useTranslation()
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
              {t('landing.preview.title')}
            </div>
            <div className="text-xl font-semibold tracking-tight">
              {t('landing.preview.drawingTitle')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tracking-tight">
              {TOTAL_NUMBERS}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('landing.preview.available')}
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
            {t('landing.preview.showing', { start: pageStart, end: pageEnd })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border bg-background text-foreground disabled:opacity-50"
              aria-label={t('landing.preview.previous')}
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
                  aria-label={t('landing.preview.goToPage', { page: i + 1 })}
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
              aria-label={t('landing.preview.next')}
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
  const { t } = useTranslation()
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Main Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span>{t('landing.badge')}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          <Trans
            i18nKey="landing.title"
            components={{ giway: <span className="text-primary" /> }}
          />
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          {t('landing.subtitle')}
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link to="/authentication/signup">{t('landing.cta.getStarted')}</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/authentication/login">{t('landing.cta.login')}</Link>
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
            {t('landing.eventTypes.title')}
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            {t('landing.eventTypes.subtitle')}
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-full text-primary w-fit mb-2">
                  <Hash className="w-6 h-6" />
                </div>
                <CardTitle>{t('landing.eventTypes.raffles.title')}</CardTitle>
                <CardDescription>
                  {t('landing.eventTypes.raffles.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{t('landing.eventTypes.raffles.feature1')}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{t('landing.eventTypes.raffles.feature2')}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{t('landing.eventTypes.raffles.feature3')}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{t('landing.eventTypes.raffles.feature4')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-full text-primary w-fit mb-2">
                  <Gift className="w-6 h-6" />
                </div>
                <CardTitle>{t('landing.eventTypes.giveaway.title')}</CardTitle>
                <CardDescription>
                  {t('landing.eventTypes.giveaway.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{t('landing.eventTypes.giveaway.feature1')}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{t('landing.eventTypes.giveaway.feature2')}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{t('landing.eventTypes.giveaway.feature3')}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{t('landing.eventTypes.giveaway.feature4')}</span>
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
          <h2 className="text-3xl font-bold text-center mb-12">
            {t('landing.howItWorks.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Gift className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">
                {t('landing.howItWorks.step1.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.howItWorks.step1.description')}
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">
                {t('landing.howItWorks.step2.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.howItWorks.step2.description')}
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">
                {t('landing.howItWorks.step3.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.howItWorks.step3.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t('landing.features.title')}
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            {t('landing.features.subtitle')}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  {t('landing.features.numberSlots.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('landing.features.numberSlots.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  {t('landing.features.participantHistory.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('landing.features.participantHistory.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  {t('landing.features.winnerSelection.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('landing.features.winnerSelection.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  {t('landing.features.imageUploads.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('landing.features.imageUploads.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  {t('landing.features.emailNotifications.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('landing.features.emailNotifications.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  {t('landing.features.watchAds.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('landing.features.watchAds.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">{t('landing.pricing.title')}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('landing.pricing.subtitle')}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card className="border-green-500/30">
              <CardHeader>
                <div className="p-2 bg-green-500/10 rounded-full text-green-500 w-fit mx-auto mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">
                  {t('landing.pricing.monthlyFree.title')}
                </CardTitle>
                <CardDescription>
                  {t('landing.pricing.monthlyFree.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-left text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.monthlyFree.feature1')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.monthlyFree.feature2')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.monthlyFree.feature3')}</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  {t('landing.pricing.monthlyFree.note')}
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/30 shadow-lg scale-105">
              <CardHeader>
                <div className="p-2 bg-primary/10 rounded-full text-primary w-fit mx-auto mb-2">
                  <Gift className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">
                  {t('landing.pricing.purchasePacks.title')}
                </CardTitle>
                <CardDescription>
                  {t('landing.pricing.purchasePacks.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-left text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.purchasePacks.feature1')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.purchasePacks.feature2')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.purchasePacks.feature3')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.purchasePacks.feature4')}</span>
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
                <CardTitle className="text-xl">
                  {t('landing.pricing.watchAds.title')}
                </CardTitle>
                <CardDescription>
                  {t('landing.pricing.watchAds.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-left text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.watchAds.feature1')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.watchAds.feature2')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t('landing.pricing.watchAds.feature3')}</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  {t('landing.pricing.watchAds.note')}
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
            {t('landing.cta.title')}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t('landing.cta.subtitle')}
          </p>
          <Button size="lg" asChild>
            <Link to="/authentication/signup">{t('landing.cta.button')}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
