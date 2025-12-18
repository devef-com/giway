import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'


const languageNames = {
  en: 'English',
  es: 'Español',
} as const

type LangCode = keyof typeof languageNames

export default function LanguageSwitcher() {

  const { i18n, t } = useTranslation()

  const current = i18n.language || "en"

  const setLanguage = (lng: LangCode) => {
    if ((i18n.language || "en") !== lng) {
      i18n.changeLanguage(lng)
    }
  }

  return (
    <button
      onClick={setLanguage.bind(null, current === 'en' ? 'es' : 'en')}
      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground/80 hover:text-foreground transition-colors rounded-lg hover:bg-muted"
      title={t("language.switcher.label")}
    >
      <Globe size={16} />
      <span className="hidden sm:inline">{languageNames[current as LangCode]}</span>
    </button>
  )
}
