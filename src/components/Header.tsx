import { Link, useLocation } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import ThemeSwitcher from './ThemeSwitcher'
import { cn } from '@/lib/utils'
import LanguageSwitcher from './LanguageSwitcher'

const NOT_VISIBLE_AT = [
  '/',
  '/authentication/login',
  '/authentication/signup',
  '/slot/*',
  '/s/*',
  '/drawings/$drawingId/p/$participateId',
  '/d/$drawingId/p/$participateId',
]

interface NavLinkProps {
  to: string
  children: React.ReactNode
  onClick?: () => void
  isMobile?: boolean
}

const NavLink = ({ to, children, onClick, isMobile = false }: NavLinkProps) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      'text-foreground/80 hover:text-foreground transition-colors',
      isMobile
        ? 'block py-3 px-2 text-base rounded-lg hover:bg-muted'
        : 'text-sm font-light',
    )}
    activeProps={{
      className: cn(
        'text-foreground font-semibold text-teal-primary',
        isMobile
          ? 'block py-3 px-2 text-base rounded-lg bg-muted'
          : 'text-sm before:content-["•"] before:mr-1',
      ),
    }}
  >
    {children}
  </Link>
)

export default function Header() {
  const { t } = useTranslation()
  const location = useLocation()
  const currentPath = location.pathname

  const Logo = () => (
    <Link to="/" className="inline-flex items-center gap-2">
      <figure className="w-6 h-6">
        <img
          src="/logo192.png"
          alt={t('app.logoAlt')}
          className="w-full h-full object-contain"
        />
      </figure>
      <span className="text-lg font-bold text-foreground">{t('app.title')}</span>
    </Link>
  )

  /**
   * Determines if the navigation menu should be visible based on the current path.
   *
   * Converts path patterns in NOT_VISIBLE_AT array to regex and tests against current path:
   * - **Exact paths**: `/` → matches exactly "/"
   * - **Wildcard paths**: `/slot/*` → matches "/slot/" followed by anything (e.g., "/slot/123", "/slot/abc/def")
   * - **Dynamic params**: `/drawings/$drawingId/p/$participateId` → matches TanStack Router params
   *   (e.g., "/drawings/123/p/456", "/drawings/abc-def/p/xyz-123")
   *
   * @returns {boolean} true if navigation should be visible, false if current path matches any hidden pattern
   */
  const isNavVisible = () => {
    const patterns = NOT_VISIBLE_AT.map((path) => {
      if (path.includes('*') || path.includes('$')) {
        let regexStr = path.replace(/\*/g, '.*').replace(/\$[^/]+/g, '[^/]+')
        return new RegExp(`^${regexStr}$`)
      } else {
        return new RegExp(`^${path}$`)
      }
    })
    return !patterns.some((pattern) => pattern.test(currentPath))
  }

  const [isOpen, setIsOpen] = useState(false)

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-dashed border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Mobile: Hamburger + Logo */}
          <div className="flex items-center gap-2 md:hidden">
            {isNavVisible() && (
              <button
                onClick={() => setIsOpen(true)}
                className="p-2 -ml-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                aria-label={t('nav.openMenu')}
              >
                <Menu size={20} />
              </button>
            )}
            <Logo />
          </div>

          {/* Desktop: Logo + Nav */}
          <div className="hidden md:flex md:items-center md:gap-6">
            <Logo />
          </div>

          {/* Desktop Navigation */}
          {isNavVisible() && (
            <nav className="hidden md:flex md:items-center md:gap-6">
              <NavLink to="/">{t('nav.home')}</NavLink>
              <NavLink to="/drawings">{t('nav.drawings')}</NavLink>
              <NavLink to="/store">{t('nav.store')}</NavLink>
              <NavLink to="/account">{t('nav.account')}</NavLink>
            </nav>
          )}

          <LanguageSwitcher />

        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-80 max-w-[85vw] bg-background shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-dashed border-border">
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -ml-2 text-foreground hover:bg-muted rounded-lg transition-colors"
            aria-label={t('nav.closeMenu')}
          >
            <X size={20} />
          </button>
          <Logo />
          <div className="w-9" /> {/* Spacer for centering logo */}
        </div>

        {/* User Info */}
        <div className="hidden px-4 py-3 border-b border-border">
          <p className="text-sm text-muted-foreground">
            {t('nav.userPlaceholderEmail')}
          </p>
        </div>

        {/* Navigation Links */}
        {isNavVisible() && (
          <nav className="flex-1 p-4 overflow-y-auto space-y-1">
            <NavLink to="/" onClick={() => setIsOpen(false)} isMobile>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/drawings" onClick={() => setIsOpen(false)} isMobile>
              {t('nav.drawings')}
            </NavLink>
            <NavLink to="/store" onClick={() => setIsOpen(false)} isMobile>
              {t('nav.store')}
            </NavLink>
            <NavLink to="/account" onClick={() => setIsOpen(false)} isMobile>
              {t('nav.account')}
            </NavLink>
          </nav>
        )}

        {/* Theme Switcher */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("theme.label")}</span>
            <ThemeSwitcher />
          </div>
        </div>
      </aside>
    </>
  )
}
