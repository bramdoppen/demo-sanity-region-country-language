import type {SanityClient} from '@sanity/client'
import {buildTranslateParams, loadTranslationContext} from './promptAssembly.ts'

export const SCHEMA_ID = '_.schemas.default'

export function translationId(sourceId: string, language: string): string {
  return `${sourceId.replace(/^drafts\./, '')}-${language}`
}

export interface TranslateFaqOptions {
  sourceId: string
  language: string
  feedback?: string
  styleGuideOverride?: string
  schemaId?: string
}

/**
 * Translate one English FAQ into one language. The translation gets a deterministic id
 * (`<source>-<lang>`) so re-running replaces the draft instead of piling up copies.
 * Returns the id of the draft that was written.
 */
export async function translateFaq(client: SanityClient, options: TranslateFaqOptions): Promise<string> {
  client = client.withConfig({perspective: 'raw'})
  const agentClient = client.withConfig({apiVersion: 'vX'})
  const sourceId = options.sourceId.replace(/^drafts\./, '')
  const source = await client.fetch<Record<string, unknown> | null>(
    `coalesce(*[_id == $draft][0], *[_id == $id][0]){question, answer, topic, relatedQuestion, demoRun}`,
    {id: sourceId, draft: `drafts.${sourceId}`},
  )
  if (!source) throw new Error(`Source FAQ ${sourceId} not found`)

  const context = await loadTranslationContext(client, options.language)
  const targetId = translationId(sourceId, options.language)
  const params = buildTranslateParams({
    schemaId: options.schemaId ?? SCHEMA_ID,
    documentId: sourceId,
    targetLanguage: options.language,
    sourceDocument: source,
    context,
    targetDocument: {operation: 'createOrReplace', _id: targetId},
    feedback: options.feedback,
    styleGuideOverride: options.styleGuideOverride,
  })

  const result = (await agentClient.agent.action.translate(params)) as {_id?: string}
  const writtenId = result?._id ?? `drafts.${targetId}`

  await client
    .patch(writtenId)
    .set({
      language: options.language,
      topic: source.topic,
      sourceFaq: {_type: 'reference', _ref: sourceId, _weak: true},
      ...(source.relatedQuestion ? {relatedQuestion: source.relatedQuestion} : {}),
      ...(source.demoRun ? {demoRun: true} : {}),
    })
    .commit()

  return writtenId
}
