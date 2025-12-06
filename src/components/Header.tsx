import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import ThemeSwitcher from './ThemeSwitcher'
import { cn } from '@/lib/utils'

const Logo = () => (
  <Link to="/" className="inline-flex items-center gap-2">
    <figure className="w-6 h-6">
      <img
        src="/logo192.png"
        alt="Giway logo"
        className="w-full h-full object-contain"
      />
    </figure>
    <span className="text-lg font-bold text-foreground">Giway</span>
  </Link>
)

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
        : 'text-sm font-medium',
    )}
    activeProps={{
      className: cn(
        'text-foreground font-semibold',
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
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 -ml-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <Logo />
          </div>

          {/* Desktop: Logo + Nav */}
          <div className="hidden md:flex md:items-center md:gap-6">
            <Logo />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:gap-6">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/drawings">Drawings</NavLink>
            <NavLink to="/store">Store</NavLink>
            <NavLink to="/account">Account</NavLink>
          </nav>

          {/* Desktop Theme Switcher (dev only) */}
          {process.env.NODE_ENV === 'production' ? (
            <div className="hidden md:block">
              <ThemeSwitcher />
            </div>
          ) : (
            <span className="hidden md:block w-24" />
          )}
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
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
          <Logo />
          <div className="w-9" /> {/* Spacer for centering logo */}
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm text-muted-foreground">username@domain.com</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 overflow-y-auto space-y-1">
          <NavLink to="/" onClick={() => setIsOpen(false)} isMobile>
            Home
          </NavLink>
          <NavLink to="/drawings" onClick={() => setIsOpen(false)} isMobile>
            Drawings
          </NavLink>
          <NavLink to="/store" onClick={() => setIsOpen(false)} isMobile>
            Store
          </NavLink>
          <NavLink to="/account" onClick={() => setIsOpen(false)} isMobile>
            Account
          </NavLink>
        </nav>

        {/* Theme Switcher */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeSwitcher />
          </div>
        </div>
      </aside>
    </>
  )
}
