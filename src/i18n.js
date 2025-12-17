import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zh from './locales/zh'

const messages = {
  en,
  zh,
}

// Get saved language from localStorage or default to browser language or 'zh'
const savedLocale = localStorage.getItem('language')
const browserLocale = navigator.language.startsWith('zh') ? 'zh' : 'en'
const defaultLocale = savedLocale || browserLocale || 'zh'

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages,
})

export default i18n
