import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/authentication/signup')({
  component: SignUp,
})

function SignUp() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const claimMonthlyAllowance = async () => {
    try {
      // Best-effort: grant the monthly allowance after signup.
      // Server will no-op (400) if already claimed.
      await fetch('/api/user/monthly-allowance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
    } catch (err) {
      // Don't block signup flow if this fails.
      console.error('Failed to claim monthly allowance after signup:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name,
      })

      if (error) {
        setError(error.message || t('auth.signup.errorDefault'))
        return
      }

      if (data) {
        await claimMonthlyAllowance()
        // Successfully signed up, redirect to home or dashboard
        navigate({ to: '/drawings' })
      }
    } catch (err) {
      setError(t('auth.signup.errorUnexpected'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    // Placeholder for Google Sign Up
    console.log('Google Sign Up Clicked')
  }

  return (
    <div className="flex min-h-[calc(100svh-72px)] w-full bg-background">
      {/* Left Side - Image */}
      <div className="hidden w-1/2 bg-black lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2529&auto=format&fit=crop"
          alt={t('auth.signup.backgroundAlt')}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white p-8">
          <h2 className="text-3xl font-bold leading-tight">
            {t('auth.signup.backgroundQuote')}
          </h2>
          <div className="mt-6">
            <p className="text-lg font-semibold">{t('auth.signup.backgroundTitle')}</p>
            <p className="text-sm text-gray-300">{t('auth.signup.backgroundSubtitle')}</p>
          </div>
        </div>
        <div className="absolute top-8 left-8 flex items-center gap-2 text-white font-bold text-xl">
          {/* Logo placeholder */}
          <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
            <img
              src="/logo_white.png"
              alt={t('app.logoAlt')}
              className="h-8/12"
            />
          </div>
          {t('app.title')}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full items-center justify-center lg:w-1/2 p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">
              {t('auth.signup.title')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('auth.signup.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('common.name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('auth.signup.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.signup.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('common.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                className="h-11"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-teal-primary hover:bg-teal-primary-dark text-white font-semibold text-base"
              disabled={loading}
            >
              {loading
                ? t('auth.signup.creatingAccount')
                : t('auth.signup.signUpButton')}
            </Button>

            <div className="hidden relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="hidden w-full h-11 font-medium"
              onClick={handleGoogleSignUp}
              disabled={loading}
            >
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t('auth.signup.haveAccount')}{' '}
            <Link
              to="/authentication/login"
              className="font-medium text-teal-primary hover:underline"
            >
              {t('auth.signup.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
