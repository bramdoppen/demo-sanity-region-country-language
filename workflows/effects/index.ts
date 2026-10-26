/**
 * Effect handlers for the three Paxon workflows. The engine queues effects; the
 * local drainer (scripts/drain.ts) runs them through these handlers.
 */
import {extractDocumentId, refDataset, type EffectHandler} from '@sanity/workflow-engine'
import {content, DATASET, PROJECT_ID, promptJson} from '../lib/env.ts'
import {askKnowledgeBase} from '../lib/kb.ts'
import {publishDocument} from '../lib/publish.ts'
import {TARGET_LANGUAGES} from '../../studio/src/translation/languages.ts'
import {
  buildBrandCheckInstruction,
  getLanguage,
  loadTranslationContext,
} from '../../studio/src/translation/promptAssembly.ts'
import {translateFaq, translationId} from '../../studio/src/translation/translateFaq.ts'

type Verdict = {flagged: boolean; reason: string}

const FAQ_TOPICS = [
  'fulfillment',
  'returns',
  'transportation',
  'regulated',
  'commerce',
  'onboarding',
  'api',
]

/**
 * Demo knob: the first French translation is written in a casual "tu" register
 * instead of the brand guideline, so the brand check reliably flags it on camera.
 * Set DEMO_FLAG_FIRST_FR=false to turn it off.
 */
const DEMO_FLAG_FIRST_FR = process.env.DEMO_FLAG_FIRST_FR !== 'false'

function bareId(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Expected a document id')
  return value.includes(':') ? extractDocumentId(value) : value.replace(/^drafts\./, '')
}

/** Latest version of a document: the draft when there is one, otherwise the published one. */
async function latest<T>(id: string, projection: string): Promise<T | null> {
  return content.fetch(`coalesce(*[_id == $draft][0], *[_id == $id][0])${projection}`, {
    id,
    draft: `drafts.${id}`,
  })
}

function setQuestion(questionId: string, fields: Record<string, unknown>) {
  return content.patch(questionId).set(fields).commit()
}

function requireVerdict(value: unknown): Verdict {
  const v = value as Partial<Verdict> | null
  if (typeof v?.flagged !== 'boolean') throw new Error('Check returned an invalid verdict')
  return {flagged: v.flagged, reason: typeof v.reason === 'string' ? v.reason : ''}
}

const workflowField = (field: string, value: unknown) => ({
  type: 'field.set' as const,
  target: {scope: 'workflow' as const, field},
  value: {type: 'literal' as const, value},
})

/** Workflow assignees need the account-global user id; project member ids start with "p". */
async function globalUserIds(ids: string[]): Promise<string[]> {
  const api = content.withConfig({useProjectHostname: false})
  const resolved = await Promise.all(
    ids.map(async (id) => {
      if (!id.startsWith('p')) return id
      const user = await api
        .request<{sanityUserId?: string}>({url: `/projects/${PROJECT_ID}/users/${id}`})
        .catch(() => undefined)
      return user?.sanityUserId
    }),
  )
  return resolved.filter((id): id is string => Boolean(id))
}

/* ---------- Workflow 1: translate and review, per language ---------- */

const translateFaqEffect: EffectHandler = async (params) => {
  const sourceId = bareId(params.sourceId)
  const language = String(params.language)
  const context = await loadTranslationContext(content, language)

  const offBrand =
    DEMO_FLAG_FIRST_FR && language === 'fr'
      ? 'Translate into French. Use a casual, chatty tone and address the reader as "tu".'
      : undefined
  const written = await translateFaq(content, {sourceId, language, styleGuideOverride: offBrand})

  const needsReview = Boolean(context.guideline?.requireHumanReview)
  const reviewers = await content.fetch<string[] | null>(
    `*[_type == "locale" && localeId == $language][0].reviewers`,
    {language},
  )
  const reviewerIds = needsReview ? await globalUserIds(reviewers ?? []) : []
  const ops = [workflowField('translationId', written), workflowField('needsReview', needsReview)]
  if (reviewerIds.length) {
    ops.push(
      workflowField(
        'reviewer',
        reviewerIds.map((id) => ({type: 'user', id})),
      ),
    )
  }

  return {outputs: {translationId: written}, ops}
}

const brandCheck: EffectHandler = async (params) => {
  const language = getLanguage(String(params.language))
  const id = bareId(params.translationId)
  const translation = await latest<{question: string; answer: string}>(id, '{question, answer}')
  const context = await loadTranslationContext(content, language.id)
  const verdict = requireVerdict(
    await promptJson({
      instruction: buildBrandCheckInstruction(language, context),
      instructionParams: {translation: JSON.stringify(translation)},
    }),
  )
  return {outputs: verdict}
}

const consistencyCheck: EffectHandler = async (params) => {
  const language = getLanguage(String(params.language))
  const source = await latest(bareId(params.sourceId), '{question, answer}')
  const translation = await latest(bareId(params.translationId), '{question, answer}')
  const verdict = requireVerdict(
    await promptJson({
      instruction: `Compare an English FAQ with its ${language.title} translation.
Flag it only when a fact differs or is missing: numbers, days, times, temperatures, prices, product names, or a sentence that was dropped or added.
Wording and register differences are fine.
English: $source
${language.title}: $translation
Respond in JSON: {"flagged": boolean, "reason": string}. Keep reason to one short sentence in English.`,
      instructionParams: {source: JSON.stringify(source), translation: JSON.stringify(translation)},
    }),
  )
  return {outputs: verdict}
}

const aiFix: EffectHandler = async (params) => {
  const sourceId = bareId(params.sourceId)
  const language = String(params.language)
  const feedback = [
    params.reviewNote ? `Reviewer: ${params.reviewNote}` : '',
    params.brandFlagged ? `Brand check: ${params.brandReason}` : '',
    params.consistencyFlagged ? `Consistency check: ${params.consistencyReason}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const written = await translateFaq(content, {sourceId, language, feedback: feedback || undefined})
  return {
    ops: [
      workflowField('translationId', written),
      workflowField('fixCount', Number(params.fixCount ?? 0) + 1),
      workflowField('reviewNote', null),
    ],
  }
}

const publishAll: EffectHandler = async (params) => {
  const sourceId = bareId(params.sourceId)
  await publishDocument(content, sourceId)
  for (const language of TARGET_LANGUAGES) {
    await publishDocument(content, translationId(sourceId, language.id))
  }

  const questionInstanceId =
    typeof params.questionInstanceId === 'string' ? params.questionInstanceId : ''
  if (questionInstanceId) {
    const {engine} = await import('../lib/engine.ts')
    await engine.fireAction({
      instanceId: questionInstanceId,
      activity: 'await-publish',
      action: 'published',
      idempotent: true,
    })
    const questionId = await content.fetch<string | null>(
      `*[_type == "customerQuestion" && draftFaq._ref == $id][0]._id`,
      {id: sourceId},
    )
    if (questionId) await setQuestion(questionId, {status: 'published'})
  }
}

/* ---------- Workflow 2: question to FAQ ---------- */

type Question = {
  _id: string
  questionText: string
  channel?: string
  market?: string
  language?: string
  signals?: Record<string, string>
  kbVerdict?: string
  kbReason?: string
  kbAnswer?: string
  citations?: {path: string; excerpt: string}[]
}

async function loadQuestion(params: Record<string, unknown>): Promise<Question> {
  const question = await latest<Question>(bareId(params.questionId), '')
  if (!question) throw new Error('Customer question not found')
  return question
}

const extractSignals: EffectHandler = async (params) => {
  const question = await loadQuestion(params)
  await setQuestion(question._id, {status: 'checking'})
  const signals = await promptJson<Record<string, string>>({
    instruction: `Extract signals from a customer question sent to Paxon, a fulfillment and logistics company.
Question: $question
Channel: $channel. Market: $market. Language: $language.
Return JSON {"intent": a short English phrase saying what the customer wants to know, "topic": one of ${FAQ_TOPICS.join(', ')}, "brand": the brand or product mentioned or "Paxon", "market": a country code, "language": a language code}.`,
    instructionParams: {
      question: question.questionText,
      channel: question.channel ?? 'unknown',
      market: question.market ?? 'unknown',
      language: question.language ?? 'unknown',
    },
  })
  await setQuestion(question._id, {signals: {_type: 'object', ...signals}})
}

const kbCheck: EffectHandler = async (params) => {
  const question = await loadQuestion(params)
  const result = await askKnowledgeBase(question.questionText)
  await setQuestion(question._id, {
    status: result.verdict === 'answered' ? 'answered' : 'findings',
    kbVerdict: result.verdict,
    kbReason: result.reason,
    kbAnswer: result.answer,
    citations: result.citations.map((c, i) => ({_key: `c${i}`, _type: 'citation', ...c})),
  })
  return {outputs: {verdict: result.verdict}}
}

const draftFaq: EffectHandler = async (params) => {
  const question = await loadQuestion(params)
  const faqs = await content.fetch<
    {_id: string; question: string; answer: string; topic: string}[]
  >(
    `*[_type == "faq" && language == "en" && !(_id in path("drafts.**"))]{_id, question, answer, topic}`,
  )
  const plan = await promptJson<{faqId: string; question: string; answer: string}>({
    instruction: `You improve Paxon's English help FAQs based on a customer question.
The Knowledge Base check found: $verdict. $reason
Correct answer according to the Knowledge Base: $kbAnswer
When the verdict is "outdated", pick the existing FAQ that covers the topic and keep its answer, including every detail that is still correct. Add one sentence that settles the question, for example "If you have seen a 45-day window elsewhere, that older policy no longer applies."
When the verdict is "missing", write a new FAQ (faqId empty). Do not invent specific numbers; when the policy is unknown, say how customers can get the details from their Paxon account manager.
Keep it to two or three short sentences, written for webshop owners.
Customer question: $question
Existing FAQs: $faqs
Return JSON {"faqId": existing _id or "", "question": string, "answer": string}.`,
    instructionParams: {
      verdict: question.kbVerdict ?? 'missing',
      reason: question.kbReason ?? '',
      kbAnswer: question.kbAnswer || '(none)',
      question: question.questionText,
      faqs: JSON.stringify(faqs),
    },
  })

  const existing = faqs.find((f) => f._id === plan.faqId)
  const faqId = existing?._id ?? `paxon-faq-q-${question._id.replace(/^paxon-question-/, '')}`
  const topic =
    existing?.topic ??
    (FAQ_TOPICS.includes(question.signals?.topic ?? '') ? question.signals?.topic : 'fulfillment')

  await content.createOrReplace({
    _id: `drafts.${faqId}`,
    _type: 'faq',
    language: 'en',
    topic,
    question: existing ? existing.question : plan.question,
    answer: plan.answer,
    relatedQuestion: {_type: 'reference', _ref: question._id, _weak: true},
    ...(existing ? {} : {demoRun: true}),
  })
  await setQuestion(question._id, {
    draftFaq: {_type: 'reference', _ref: faqId, _weak: true},
    faqBefore: existing?.answer ?? '',
    faqAfter: plan.answer,
  })
  return {outputs: {faqId}}
}

const startLocalization: EffectHandler = async (params, ctx) => {
  const faqId = bareId(params.faqId)
  const {engine} = await import('../lib/engine.ts')
  await engine.startInstance({
    definition: 'faq-localization',
    initialFields: [
      {
        type: 'subject',
        name: 'subject',
        value: refDataset({
          projectId: PROJECT_ID,
          dataset: DATASET,
          documentId: faqId,
          type: 'faq',
        }),
      },
      {type: 'string', name: 'origin', value: 'question'},
      {type: 'string', name: 'questionInstanceId', value: ctx.instanceId},
    ],
  })
  const questionId = await content.fetch<string | null>(
    `*[_type == "customerQuestion" && draftFaq._ref == $id][0]._id`,
    {id: faqId},
  )
  if (questionId) await setQuestion(questionId, {status: 'in-review'})
}

export const effectHandlers: Record<string, EffectHandler> = {
  'translate-faq': translateFaqEffect,
  'brand-check': brandCheck,
  'consistency-check': consistencyCheck,
  'ai-fix': aiFix,
  'publish-all': publishAll,
  'extract-signals': extractSignals,
  'kb-check': kbCheck,
  'draft-faq': draftFaq,
  'start-localization': startLocalization,
}

/** Plain-language labels for the drainer's log. */
export const EFFECT_LABELS: Record<string, string> = {
  'translate-faq': 'Translating with the brand guideline',
  'brand-check': 'Checking against the brand guideline',
  'consistency-check': 'Checking facts against the English source',
  'ai-fix': 'Fixing the translation with the check results',
  'publish-all': 'Publishing English and every translation',
  'extract-signals': 'Extracting signals from the question',
  'kb-check': 'Asking the Knowledge Base',
  'draft-faq': 'Drafting the FAQ change',
  'start-localization': 'Handing off to Translate and review',
}
