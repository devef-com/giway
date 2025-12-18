import { Link, createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  Calendar,
  CopyIcon,
  Cpu,
  DollarSign,
  Eye,
  Gift,
  Hash,
  PlusIcon,
  Share2Icon,
  User,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDrawings } from '@/querys/useDrawings'
import { getTimeRemainingText } from '@/lib/utils'
import getSession from '@/server-fn/get-session'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/drawings/')({
  component: DrawingsList,
  loader: async () => {
    const session = await getSession()
    return { session }
  },
})

function DrawingsList() {
  // const session = authClient.useSession()
  const { t } = useTranslation()
  const { session } = Route.useLoaderData()

  const { data: drawings, isLoading } = useDrawings(!!session)

  // navigator.userAgent.includes

  // if (!session.data) {
  //   return (
  //     <div className="min-h-screen p-6">
  //       <div className="max-w-4xl mx-auto">
  //         <Card className="p-6 bg-slate-800/50 border-slate-700">
  //           <p className="text-white text-center">
  //             Please log in to view your drawings.{' '}
  //             <a
  //               href="/authentication/login"
  //               className="text-cyan-400 hover:text-cyan-300"
  //             >
  //               Login
  //             </a>
  //           </p>
  //         </Card>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-[calc(100svh-129px)] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">{t('drawings.title')}</h1>
          <Link to="/drawings/create">
            <Button variant="default">
              <PlusIcon className="w-4 h-4" />
              {t('drawings.new')}
            </Button>
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={`skeleton-${i}`}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col justify-between items-start h-32">
                    <div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="flex gap-2 self-end mt-2">
                      <Skeleton className="h-10 w-16" />
                      <Skeleton className="h-10 w-10" />
                      <Skeleton className="h-10 w-10" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : drawings && drawings.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {drawings.map((drawing: any) => (
              <Card key={drawing.id} className="">
                <CardHeader>
                  <CardTitle>{drawing.title}</CardTitle>
                  <CardDescription>
                    {t('drawings.createdOn')}{' '}
                    {new Date(drawing.createdAt).toLocaleDateString(
                      navigator.language,
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      },
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {drawing.winnerSelection === 'manually' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Cpu className="w-4 h-4" />
                        )}
                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                          {t('drawings.selection')}:{' '}
                          {drawing.winnerSelection === 'manually'
                            ? t('drawings.selectionManual')
                            : t('drawings.selectionSystem')}
                        </span>
                      </div>
                      {drawing.playWithNumbers && (
                        <div className="flex items-center gap-2 mb-2">
                          <Hash className="w-4 h-4" />
                          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                            {t('drawings.numbers')}: {drawing.quantityOfNumbers}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        {drawing.isPaid ? (
                          <DollarSign className="w-4 h-4" />
                        ) : (
                          <Gift className="w-4 h-4" />
                        )}
                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                          {t('drawings.type')}:{' '}
                          {drawing.isPaid
                            ? `${t('drawings.paid')} ($${(drawing.price ?? 0).toLocaleString()})`
                            : t('common.free')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                          {t('drawings.endDate')}: {getTimeRemainingText(drawing.endAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end mt-2">
                      <Link
                        to={`/drawings/$drawingId`}
                        params={{ drawingId: drawing.id }}
                      >
                        <Button variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          {t('drawings.view')}
                        </Button>
                      </Link>
                      <Button
                        onClick={() => {
                          // toast.success('Lol!')
                          const url = `${window.location.origin}/slot/${drawing.id}`
                          navigator.clipboard.writeText(url).then(() => {
                            toast.success(t('drawings.linkCopied'))
                          })
                        }}
                        variant="outline"
                        size="icon"
                      >
                        <CopyIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          const url = `${window.location.origin}/slot/${drawing.id}`
                          navigator
                            .share({
                              title: t('drawings.shareTitle'),
                              text: drawing.title,
                              url: url,
                            })
                            .catch(() => {
                              // Handle share failure or cancellation
                              console.log('Share failed or was cancelled')
                            })
                        }}
                        variant="outline"
                        size="icon"
                      >
                        <Share2Icon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 min-h-40 ">
            <p className="text-center my-auto">
              {t('drawings.none')}{' '}
              <Link
                to="/drawings/create"
                className="text-cyan-400 hover:text-cyan-300"
              >
                {t('drawings.createFirst')}
              </Link>
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
