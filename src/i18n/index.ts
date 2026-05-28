import { en } from './en'
import { ru } from './ru'
import { useGameStore } from '../store/gameStore'

export const locales = { en, ru }
export type Locale = keyof typeof locales
export type { Translations } from './en'

export function useT() {
  const language = useGameStore(s => s.language)
  return locales[language as Locale] ?? en
}
