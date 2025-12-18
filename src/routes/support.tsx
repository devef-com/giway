import { createFileRoute } from '@tanstack/react-router'
import {
  Expandable,
  ExpandableContent,
  ExpandableTitle,
} from '@/components/ui/expandable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/support')({
  component: SupportPage,
})

function SupportPage() {
  const { t } = useTranslation()
  return (
    <div>
      <main className="container mx-auto py-10 px-4 max-w-3xl min-h-[calc(100svh-129px)]">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">{t('support.title')}</h1>
            <p className="text-muted-foreground text-lg">{t('support.subtitle')}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('support.faq.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Expandable className="border rounded-md">
                <ExpandableTitle>{t('support.faq.whatIsGiway.q')}</ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    {t('support.faq.whatIsGiway.a')}
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>{t('support.faq.freeVsPaid.q')}</ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    {t('support.faq.freeVsPaid.a')}
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>{t('support.faq.playWithNumbers.q')}</ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    {t('support.faq.playWithNumbers.a')}
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>{t('support.faq.moreParticipants.q')}</ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    {t('support.faq.moreParticipants.a')}
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>{t('support.faq.rejectParticipant.q')}</ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    {t('support.faq.rejectParticipant.a')}
                  </p>
                </ExpandableContent>
              </Expandable>

              <Expandable className="border rounded-md">
                <ExpandableTitle>{t('support.faq.packsExpire.q')}</ExpandableTitle>
                <ExpandableContent>
                  <p className="text-muted-foreground">
                    {t('support.faq.packsExpire.a')}
                  </p>
                </ExpandableContent>
              </Expandable>
            </CardContent>
          </Card>

          <div className="text-center space-y-4 pt-8">
            <h2 className="text-2xl font-semibold">{t('support.contact.title')}</h2>
            <p className="text-muted-foreground">{t('support.contact.subtitle')}</p>
            {/* Placeholder for contact button or email */}
            <a
              href="mailto:team@giway.com"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              {t('support.contact.button')}
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
