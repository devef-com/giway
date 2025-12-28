import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'
import { db } from '@/db/index'
import { sendEmail } from './email'
import { render } from '@react-email/components'
import { VerificationEmail } from './emails/VerificationEmail'
import { ResetPasswordEmail } from './emails/ResetPasswordEmail'

export const auth = betterAuth({
  plugins: [expo()],
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const html = await render(ResetPasswordEmail({ url }))
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        text: `Click the link to reset your password: ${url}`,
        html,
      })
    },
    onPasswordReset: async ({ user }) => {
      // your logic here
      console.log(`Password for user ${user.email} has been reset.`)
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const html = await render(VerificationEmail({ url }))
      await sendEmail({
        to: user.email,
        subject: 'Verify your email address',
        text: `Click the link to verify your email: ${url}`,
        html,
      })
    },
  },
  trustedOrigins: [
    // Basic scheme
    'giway-app://',

    // Production & staging schemes
    'giway-app-prod://',
    'giway-app-staging://',

    // Wildcard support for all paths following the scheme
    'giway-app://*',
    // Development mode - Expo's exp:// scheme with local IP ranges
    ...(process.env.NODE_ENV === 'development'
      ? [
          'exp://*/*', // Trust all Expo development URLs
          'exp://10.0.0.*:*/*', // Trust 10.0.0.x IP range
          'exp://192.168.*.*:*/*', // Trust 192.168.x.x IP range
          'exp://172.*.*.*:*/*', // Trust 172.x.x.x IP range
          'exp://localhost:*/*', // Trust localhost
        ]
      : []),
  ],
})
