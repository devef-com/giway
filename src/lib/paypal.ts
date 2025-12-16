type PayPalEnv = 'sandbox' | 'live'

function getPayPalEnv(): PayPalEnv {
  const env = (process.env.PAYPAL_ENV ?? 'sandbox').toLowerCase()
  return env === 'live' || env === 'production' ? 'live' : 'sandbox'
}

export function getPayPalBaseUrl() {
  return getPayPalEnv() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

function requirePayPalCreds() {
  const env = getPayPalEnv()

  const clientId =
    process.env.PAYPAL_CLIENT_ID ||
    (env === 'live'
      ? process.env.PAYPAL_LIVE_CLIENT_ID
      : process.env.PAYPAL_SANDBOX_CLIENT_ID)

  const clientSecret =
    process.env.PAYPAL_CLIENT_SECRET ||
    (env === 'live'
      ? process.env.PAYPAL_LIVE_CLIENT_SECRET
      : process.env.PAYPAL_SANDBOX_CLIENT_SECRET)

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing PayPal credentials. Set PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET or the environment-specific vars (PAYPAL_SANDBOX_CLIENT_ID/PAYPAL_SANDBOX_CLIENT_SECRET, PAYPAL_LIVE_CLIENT_ID/PAYPAL_LIVE_CLIENT_SECRET).',
    )
  }

  return { clientId, clientSecret }
}

let cachedAccessToken: { token: string; expiresAtMs: number } | undefined

export async function getPayPalAccessToken() {
  const now = Date.now()
  if (cachedAccessToken && cachedAccessToken.expiresAtMs - 30_000 > now) {
    return cachedAccessToken.token
  }

  const { clientId, clientSecret } = requirePayPalCreds()
  const baseUrl = getPayPalBaseUrl()

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`PayPal token request failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
  }

  cachedAccessToken = {
    token: data.access_token,
    expiresAtMs: now + data.expires_in * 1000,
  }

  return data.access_token
}

export function centsToUsdString(cents: number) {
  return (cents / 100).toFixed(2)
}
