import React from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
// import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
// import { TanStackDevtools } from '@tanstack/react-devtools'
import { ThemeProvider } from 'next-themes'

import Header from '../components/Header'

// import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import Footer from '@/components/Footer'
import { useTranslation } from "react-i18next"
import { setSSRLanguage } from "@/lib/i18n"
interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    await setSSRLanguage()
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Giway',
      },
      {
        name: 'description',
        content: 'Giway - The easiest way to manage drawings and giveaways.',
      },
      {
        name: 'keywords',
        content: 'giveaway, drawing, contest, winners, participants',
      },
      {
        name: 'author',
        content: 'Giway',
      },
      {
        name: 'theme-color',
        content: '#ffffff',
      },
      {
        property: 'og:title',
        content: 'Giway',
      },
      {
        property: 'og:description',
        content: 'Giway - The easiest way to manage drawings and giveaways.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Giway',
      },
      {
        name: 'twitter:description',
        content: 'Giway - The easiest way to manage drawings and giveaways.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const routerState = useRouterState()
  const router = useRouter()
  const { i18n } = useTranslation()

  const isAuthRoute = [
    '/authentication/login',
    '/authentication/signup',
  ].includes(routerState.location.pathname)

  React.useEffect(() => {
    const handler = () => {
      router.invalidate()
    }
    i18n.on("languageChanged", handler)
    return () => {
      i18n.off("languageChanged", handler)
    }
  }, [router])

  return (
    <html lang={i18n.language} suppressHydrationWarning className="notranslate">
      <head>
        <HeadContent />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          crossOrigin=""
          href="https://fonts.gstatic.com"
          rel="preconnect"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Stack+Sans+Text:wght@200..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {!isAuthRoute && <Header />}
          {children}
          <Footer />
          {/* {process.env.NODE_ENV !== 'production' && (
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
          )} */}
          <Scripts />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
