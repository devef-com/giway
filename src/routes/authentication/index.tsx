import { Link, createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/authentication/')({
  component: Authentication,
})

function Authentication() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('auth.index.title')}</CardTitle>
          <CardDescription>{t('auth.index.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link to="/authentication/login" className="block">
            <Button className="w-full" variant="default" size="lg">
              {t('auth.login.loginButton')}
            </Button>
          </Link>
          <Link to="/authentication/signup" className="block">
            <Button className="w-full" variant="outline" size="lg">
              {t('auth.signup.signUpButton')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
