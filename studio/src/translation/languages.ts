export interface PaxonLanguage {
  id: string
  title: string
}

export const SOURCE_LANGUAGE: PaxonLanguage = {id: 'en', title: 'English'}

export const TARGET_LANGUAGES: PaxonLanguage[] = [
  {id: 'nl', title: 'Dutch'},
  {id: 'fr', title: 'French'},
  {id: 'de', title: 'German'},
]

export const ALL_LANGUAGES = [SOURCE_LANGUAGE, ...TARGET_LANGUAGES]

export const languageOptions = ALL_LANGUAGES.map((l) => ({value: l.id, title: l.title}))

export function languageTitle(id: string | undefined): string {
  return ALL_LANGUAGES.find((l) => l.id === id)?.title ?? id ?? ''
}
