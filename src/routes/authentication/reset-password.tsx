import React, { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

// @ts-ignore
export const Route = createFileRoute('/authentication/reset-password')({
  component: ResetPassword,
})

function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error(t('auth.resetPassword.passwordsDoNotMatch'))
      return
    }

    setLoading(true)

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
      })

      if (error) {
        toast.error(error.message || t('auth.resetPassword.errorDefault'))
        return
      }

      toast.success(t('auth.resetPassword.successMessage'))
      navigate({ to: '/authentication/login' })
    } catch (err) {
      toast.error(t('auth.resetPassword.errorUnexpected'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100svh-72px)] w-full bg-background">
      {/* Left Side - Image */}
      <div className="hidden w-1/2 bg-black lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
          alt={t('auth.login.backgroundAlt')}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white p-8">
          <h2 className="text-2xl font-bold leading-tight">
            {t('auth.login.backgroundQuote')}
          </h2>
        </div>
        <div className="absolute top-8 left-8 flex items-center gap-2 text-white font-bold text-xl">
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
              {t('auth.resetPassword.title')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('auth.resetPassword.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.resetPassword.newPassword')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.resetPassword.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-teal-primary hover:bg-teal-primary-dark text-white font-semibold text-base"
              disabled={loading}
            >
              {loading
                ? t('auth.resetPassword.resetting')
                : t('auth.resetPassword.resetButton')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
