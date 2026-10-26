/**
 * Turns the brand guidelines and glossary that editors maintain in Studio into
 * Agent Actions translate parameters (`styleGuide` + `protectedPhrases`).
 *
 * Shared by the Studio action, the CLI scripts and the workflow effect handlers,
 * so it must stay free of Studio-only imports.
 */
import {SOURCE_LANGUAGE, TARGET_LANGUAGES, type PaxonLanguage} from './languages.ts'

export interface TermPair {
  avoid?: string
  use?: string
}

export interface BrandGuideline {
  _id?: string
  language: string
  formality?: 'formal' | 'neutral' | 'informal'
  tone?: string[]
  instructions?: string
  useTerms?: TermPair[]
  requireHumanReview?: boolean
}

export interface GlossaryEntry {
  _id?: string
  term: string
  status?: 'approved' | 'forbidden' | 'provisional'
  doNotTranslate?: boolean
  definition?: string
  translations?: {language?: string; translation?: string}[]
}

export interface TranslationContext {
  guideline: BrandGuideline | null
  glossary: GlossaryEntry[]
}

export const TRANSLATION_CONTEXT_QUERY = `{
  "guideline": *[_type == "brandGuideline" && language == $language && !(_id in path("drafts.**"))][0]{
    _id, language, formality, tone, instructions, useTerms[]{avoid, use}, requireHumanReview
  },
  "glossary": *[_type == "glossaryEntry" && !(_id in path("drafts.**"))]{
    _id, term, status, doNotTranslate, definition, translations[]{language, translation}
  }
}`

type Fetcher = {fetch: <R>(query: string, params: Record<string, unknown>) => Promise<R>}

export async function loadTranslationContext(
  client: Fetcher,
  language: string,
): Promise<TranslationContext> {
  const result = await client.fetch<TranslationContext>(TRANSLATION_CONTEXT_QUERY, {language})
  return {guideline: result.guideline ?? null, glossary: result.glossary ?? []}
}

export function getLanguage(id: string): PaxonLanguage {
  const language = [SOURCE_LANGUAGE, ...TARGET_LANGUAGES].find((l) => l.id === id)
  if (!language) throw new Error(`Unknown language "${id}"`)
  return language
}

export function extractText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(extractText).join(' ')
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !key.startsWith('_'))
      .map(([, v]) => extractText(v))
      .join(' ')
  }
  return ''
}

/**
 * RAG-style filtering: only glossary terms that occur in the source text,
 * plus do-not-translate and forbidden terms, which always act as guardrails.
 */
export function filterGlossaryByContent(glossary: GlossaryEntry[], source: unknown): GlossaryEntry[] {
  const text = extractText(source).toLowerCase()
  return glossary.filter(
    (entry) =>
      entry.doNotTranslate ||
      entry.status === 'forbidden' ||
      (entry.term && text.includes(entry.term.toLowerCase())),
  )
}

export function buildStyleGuide(
  language: PaxonLanguage,
  {guideline, glossary}: TranslationContext,
): string {
  const lines: string[] = [`You are translating customer help content for Paxon into ${language.title}.`]

  if (guideline?.formality) lines.push(`Register: ${guideline.formality}.`)
  if (guideline?.tone?.length) lines.push(`Tone of voice: ${guideline.tone.join(', ')}.`)
  if (guideline?.instructions) lines.push(guideline.instructions)

  const pairs = (guideline?.useTerms ?? []).filter((p) => p.use)
  if (pairs.length) {
    lines.push('Terminology to use:')
    for (const pair of pairs) {
      lines.push(pair.avoid ? `- Use "${pair.use}", never "${pair.avoid}".` : `- Use "${pair.use}".`)
    }
  }

  const dnt = glossary.filter((g) => g.doNotTranslate)
  if (dnt.length) {
    lines.push(`Never translate these names: ${dnt.map((g) => `"${g.term}"`).join(', ')}.`)
  }

  const approved = glossary.filter((g) => !g.doNotTranslate && g.status !== 'forbidden')
  for (const entry of approved) {
    const translation = entry.translations?.find((t) => t.language === language.id)?.translation
    if (translation) lines.push(`- Translate "${entry.term}" as "${translation}".`)
  }

  const forbidden = glossary.filter((g) => g.status === 'forbidden')
  if (forbidden.length) {
    lines.push(`Never use: ${forbidden.map((g) => `"${g.term}"`).join(', ')}.`)
  }

  lines.push(
    'Keep the facts identical to the source: numbers, time windows, prices, URLs and e-mail addresses. Use local conventions for writing times and dates (e.g. 2 p.m. becomes 14:00).',
  )
  return lines.join('\n')
}

export function buildProtectedPhrases(glossary: GlossaryEntry[]): string[] {
  return glossary.filter((g) => g.doNotTranslate).map((g) => g.term)
}

export interface TranslateParamsInput {
  schemaId: string
  documentId: string
  targetLanguage: string
  sourceDocument: unknown
  context: TranslationContext
  /** Defaults to creating a new unlinked draft. */
  targetDocument?: {operation: 'create'} | {operation: 'createOrReplace'; _id: string}
  /** Extra instruction appended to the style guide, e.g. reviewer feedback. */
  feedback?: string
  /** Replaces the brand style guide entirely. */
  styleGuideOverride?: string
}

export function buildTranslateParams(input: TranslateParamsInput) {
  const toLanguage = getLanguage(input.targetLanguage)
  const context = {
    guideline: input.context.guideline,
    glossary: filterGlossaryByContent(input.context.glossary, input.sourceDocument),
  }
  let styleGuide = input.styleGuideOverride ?? buildStyleGuide(toLanguage, context)
  if (input.feedback) styleGuide += `\nApply this reviewer feedback: ${input.feedback}`

  return {
    schemaId: input.schemaId,
    documentId: input.documentId,
    targetDocument: input.targetDocument ?? {operation: 'create' as const},
    fromLanguage: SOURCE_LANGUAGE,
    toLanguage,
    languageFieldPath: 'language',
    styleGuide,
    protectedPhrases: buildProtectedPhrases(context.glossary),
    target: {include: ['question', 'answer']},
  }
}

/** Instruction for the per-language brand check (Agent Actions prompt). */
export function buildBrandCheckInstruction(language: PaxonLanguage, context: TranslationContext): string {
  return [
    `You review a ${language.title} FAQ translation for Paxon against the brand guideline below.`,
    'Flag it only for concrete violations: a term from the "never" list, a translated brand name, or the wrong register.',
    '--- Brand guideline ---',
    buildStyleGuide(language, context),
    '--- Translation ---',
    '$translation',
    'Respond in JSON: {"flagged": boolean, "reason": string}. Keep reason to one short sentence in English.',
  ].join('\n')
}
