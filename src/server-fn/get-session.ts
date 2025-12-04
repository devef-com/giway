import { authMiddleware } from '@/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'

const getSession = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return context.session
  })

export default getSession
