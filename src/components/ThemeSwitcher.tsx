import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-24" /> // Placeholder to prevent layout shift
  }

  const themes = [
    { name: 'System', value: 'system', icon: Monitor },
    { name: 'Light', value: 'light', icon: Sun },
    { name: 'Dark', value: 'dark', icon: Moon },
  ]

  return (
    <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
      {themes.map(({ name, value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            theme === value
              ? 'bg-cyan-600 text-white'
              : 'text-gray-300 hover:bg-gray-600 hover:text-white'
          }`}
          aria-label={`Switch to ${name} theme`}
          title={`Switch to ${name} theme`}
        >
          <Icon size={16} />
          <span className="hidden sm:inline">{name}</span>
        </button>
      ))}
    </div>
  )
}
