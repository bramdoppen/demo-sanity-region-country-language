import {Suspense, useState} from 'react'
import {useCurrentUser, useQuery} from '@sanity/sdk-react'
import {approve, sendBack, useCheckQuestion, useEngine, WORKFLOW_RESOURCE} from './workflow.ts'

type Citation = {_key: string; path: string; excerpt: string}
type Question = {
  _id: string
  questionText: string
  channel?: string
  market?: string
  language?: string
  receivedAt?: string
  status?: string
  signals?: {intent?: string; topic?: string; brand?: string; market?: string; language?: string}
  kbVerdict?: 'answered' | 'outdated' | 'missing'
  kbReason?: string
  kbAnswer?: string
  citations?: Citation[]
  faqId?: string
  faqQuestion?: string
  faqBefore?: string
  faqAfter?: string
  insights?: {contentGap?: string; successScore?: number; sentiment?: string}
}
type Review = {
  _id: string
  language: string
  sourceId: string
  translationId: string
  checks: {name: string; outputs?: {flagged?: boolean; reason?: string}}[]
}
type LanguageRun = {_id: string; language: string; stage: string; completed: boolean}

const STATUS: Record<string, string> = {
  'new': 'New',
  'checking': 'Checking',
  'answered': 'Already answered',
  'findings': 'Findings',
  'in-review': 'In review',
  'published': 'Published',
}
const VERDICT: Record<string, string> = {
  answered: 'Answered',
  outdated: 'Outdated',
  missing: 'Missing',
}
const LANGUAGE: Record<string, string> = {en: 'English', nl: 'Dutch', fr: 'French', de: 'German'}
const STAGE: Record<string, string> = {
  translate: 'Translating',
  check: 'Checking',
  fix: 'Fixing',
  review: 'In review',
  approved: 'Approved',
}

const QUESTIONS = `*[_type == "customerQuestion" && !(_id in path("drafts.**"))] | order(receivedAt desc){
  _id, questionText, channel, market, language, receivedAt, status, signals, insights,
  kbVerdict, kbReason, kbAnswer, citations, faqBefore, faqAfter,
  "faqId": draftFaq._ref,
  "faqQuestion": coalesce(*[_id == "drafts." + ^.draftFaq._ref][0].question, *[_id == ^.draftFaq._ref][0].question)
}`

const REVIEWS = `*[_type == "sanity.workflow.instance" && tag == "demo" && definition == "faq-language"
  && currentStage == "review" && !defined(completedAt)
  && $me in fields[name == "reviewer"][0].value[].id] | order(_createdAt asc){
  _id,
  "language": fields[name == "language"][0].value,
  "sourceId": fields[name == "sourceId"][0].value,
  "translationId": fields[name == "translationId"][0].value,
  "checks": effectHistory[name in ["brand-check", "consistency-check"]]{name, outputs}
}`

const LANGUAGE_RUNS = `*[_type == "sanity.workflow.instance" && tag == "demo" && definition == "faq-language"
  && fields[name == "sourceId"][0].value == $source] | order(_createdAt desc){
  _id, "language": fields[name == "language"][0].value, "stage": currentStage, "completed": defined(completedAt)
}`

const bare = (id: string) =>
  id
    .split(':')
    .pop()!
    .replace(/^drafts\./, '')
const timeAgo = (iso?: string) => {
  if (!iso) return ''
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`
}

const initial = new URLSearchParams(window.location.search)

export function Desk() {
  const [tab, setTab] = useState<'inbox' | 'me'>(initial.get('tab') === 'me' ? 'me' : 'inbox')
  return (
    <div className="desk">
      <header className="topbar">
        <div className="brand">
          <span className="logo">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M10.2 2h3.6v6.4L17 5.2l2.6 2.6-4.4 4.4H22v3.6h-6.4l3.2 3.2-2.6 2.6-4.4-4.4V22h-3.6v-6.4L5 18.8l-2.6-2.6 4.4-4.4H2V8.2h6.4L5.2 5 7.8 2.4l2.4 2.4z" />
            </svg>
            paxon
          </span>
          <span className="brand-divider" />
          Question Desk
        </div>
        <nav className="tabs">
          <button className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')}>
            Inbox
          </button>
          <button className={tab === 'me' ? 'active' : ''} onClick={() => setTab('me')}>
            For me
            <Suspense fallback={null}>
              <ReviewCount />
            </Suspense>
          </button>
        </nav>
      </header>
      <Suspense fallback={<div className="loading">Loading…</div>}>
        {tab === 'inbox' ? <Inbox /> : <ForMe />}
      </Suspense>
    </div>
  )
}

function useReviews(): Review[] {
  const user = useCurrentUser()
  const {data} = useQuery<Review[]>({
    query: REVIEWS,
    params: {me: user?.id ?? ''},
    resource: WORKFLOW_RESOURCE,
    perspective: 'raw',
  })
  return data ?? []
}

function ReviewCount() {
  const count = useReviews().length
  return count ? <span className="count">{count}</span> : null
}

/* ---------------- Inbox ---------------- */

function Inbox() {
  const {data} = useQuery<Question[]>({query: QUESTIONS, perspective: 'raw'})
  const questions = data ?? []
  const [selectedId, setSelectedId] = useState<string | null>(initial.get('q'))
  const selected = questions.find((q) => q._id === selectedId) ?? questions[0]

  return (
    <main className="inbox">
      <ul className="list">
        {questions.map((q) => (
          <li key={q._id}>
            <button
              className={q._id === selected?._id ? 'row selected' : 'row'}
              onClick={() => setSelectedId(q._id)}
            >
              <div className="row-text">{q.questionText}</div>
              <div className="row-meta">
                <StatusPill status={q.status ?? 'new'} />
                <span>
                  {q.channel === 'contactCentre' ? 'Contact centre' : 'Chatbot'} · {q.market} ·{' '}
                  {timeAgo(q.receivedAt)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {selected ? <Detail question={selected} /> : <div className="empty">No questions yet.</div>}
    </main>
  )
}

function StatusPill({status}: {status: string}) {
  return <span className={`pill pill-${status}`}>{STATUS[status] ?? status}</span>
}

function Detail({question: q}: {question: Question}) {
  const checkQuestion = useCheckQuestion()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const status = q.status ?? 'new'

  async function onCheck() {
    setBusy(true)
    setError('')
    try {
      await checkQuestion(q._id)
    } catch {
      setError('Could not start the check. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="detail">
      <div className="detail-head">
        <StatusPill status={status} />
        <span className="muted">
          {q.channel === 'contactCentre' ? 'Contact centre' : 'Chatbot'} · {q.market} ·{' '}
          {LANGUAGE[q.language ?? ''] ?? q.language}
        </span>
      </div>
      <h1 className="question">“{q.questionText}”</h1>

      {q.insights?.contentGap && (
        <Card title="From Insights">
          <p className="reason">The help chat couldn't answer this: {q.insights.contentGap}</p>
          <p className="muted">
            Success score {q.insights.successScore}/10 · {q.insights.sentiment} sentiment
          </p>
        </Card>
      )}

      {status === 'new' && (
        <button className="primary" disabled={busy} onClick={onCheck}>
          {busy ? 'Starting…' : 'Check against the Knowledge Base'}
        </button>
      )}
      {error && <p className="error">{error}</p>}

      {status === 'checking' && !q.signals && <p className="working">Reading the question…</p>}

      {q.signals && (
        <Card title="Signals">
          <dl className="signals">
            <Signal label="Asked" value={q.signals.intent} />
            <Signal label="Topic" value={q.signals.topic} />
            <Signal label="Brand" value={q.signals.brand} />
            <Signal label="Market" value={q.signals.market} />
            <Signal
              label="Language"
              value={LANGUAGE[q.signals.language ?? ''] ?? q.signals.language}
            />
          </dl>
        </Card>
      )}

      {q.signals && !q.kbVerdict && <p className="working">Asking the Knowledge Base…</p>}

      {q.kbVerdict && (
        <Card title="Knowledge Base">
          <div className={`verdict verdict-${q.kbVerdict}`}>{VERDICT[q.kbVerdict]}</div>
          <p className="reason">{q.kbReason}</p>
          {q.citations?.length ? (
            <ul className="citations">
              {q.citations.map((c) => (
                <li key={c._key}>
                  <span className="cite-path">{c.path}</span>
                  <span className="cite-excerpt">“{c.excerpt}”</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      )}

      {status === 'findings' && !q.faqAfter && <p className="working">Drafting the FAQ change…</p>}

      {q.faqAfter && (
        <Card title={q.faqBefore ? 'FAQ change' : 'New FAQ'}>
          {q.faqQuestion && <h3 className="faq-question">{q.faqQuestion}</h3>}
          <div className={q.faqBefore ? 'diff' : 'diff single'}>
            {q.faqBefore && (
              <div className="before">
                <div className="diff-label">Before</div>
                <p>{q.faqBefore}</p>
              </div>
            )}
            <div className="after">
              <div className="diff-label">{q.faqBefore ? 'After' : 'Draft'}</div>
              <p>{q.faqAfter}</p>
            </div>
          </div>
        </Card>
      )}

      {q.faqId && (status === 'in-review' || status === 'published') && (
        <Suspense fallback={null}>
          <Languages faqId={q.faqId} />
        </Suspense>
      )}
    </section>
  )
}

function Signal({label, value}: {label: string; value?: string}) {
  if (!value) return null
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

function Card({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      {children}
    </div>
  )
}

function Languages({faqId}: {faqId: string}) {
  const {data} = useQuery<LanguageRun[]>({
    query: LANGUAGE_RUNS,
    params: {source: `dataset:jitb27qd:production:${faqId}`},
    resource: WORKFLOW_RESOURCE,
    perspective: 'raw',
  })
  const latest = new Map<string, LanguageRun>()
  for (const run of data ?? []) if (!latest.has(run.language)) latest.set(run.language, run)
  const runs = ['nl', 'fr', 'de'].map((l) => latest.get(l)).filter(Boolean) as LanguageRun[]
  if (!runs.length) return null

  return (
    <Card title="Translate and review">
      <div className="languages">
        {runs.map((run) => (
          <div key={run._id} className={`lang lang-${run.stage}`}>
            <div className="lang-name">{LANGUAGE[run.language]}</div>
            <div className="lang-stage">{STAGE[run.stage] ?? run.stage}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------------- For me ---------------- */

function ForMe() {
  const reviews = useReviews()
  if (!reviews.length) {
    return (
      <main className="forme">
        <div className="empty">Nothing to review right now.</div>
      </main>
    )
  }
  return (
    <main className="forme">
      {reviews.map((review) => (
        <Suspense key={review._id} fallback={<div className="card">Loading…</div>}>
          <ReviewCard review={review} />
        </Suspense>
      ))}
    </main>
  )
}

function ReviewCard({review}: {review: Review}) {
  const engine = useEngine()
  const sourceId = bare(review.sourceId)
  const {data} = useQuery<{
    source?: {question: string; answer: string}
    translation?: {question: string; answer: string}
  }>({
    query: `{
      "source": coalesce(*[_id == "drafts." + $source][0], *[_id == $source][0]){question, answer},
      "translation": coalesce(*[_id == $translation][0], *[_id == "drafts." + $bareTranslation][0], *[_id == $bareTranslation][0]){question, answer}
    }`,
    params: {
      source: sourceId,
      translation: review.translationId,
      bareTranslation: bare(review.translationId),
    },
    perspective: 'raw',
  })
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const lastChecks = ['brand-check', 'consistency-check'].map((name) =>
    [...(review.checks ?? [])].reverse().find((c) => c.name === name),
  )
  const flaggedBefore = (review.checks ?? []).some((c) => c.outputs?.flagged)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch {
      setError('That did not go through. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="card review">
      <div className="review-head">
        <span className="lang-badge">{LANGUAGE[review.language]}</span>
        <span className="muted">Translation review</span>
      </div>
      <div className="diff">
        <div className="before">
          <div className="diff-label">English</div>
          <h3>{data?.source?.question}</h3>
          <p>{data?.source?.answer}</p>
        </div>
        <div className="after">
          <div className="diff-label">{LANGUAGE[review.language]}</div>
          <h3>{data?.translation?.question}</h3>
          <p>{data?.translation?.answer}</p>
        </div>
      </div>
      <ul className="checks">
        {lastChecks.map((check, i) =>
          check ? (
            <li key={i} className={check.outputs?.flagged ? 'flag' : 'pass'}>
              {i === 0 ? 'Brand check' : 'Consistency check'}:{' '}
              {check.outputs?.flagged ? 'flagged' : 'passed'}
              {check.outputs?.flagged ? ` — ${check.outputs.reason}` : ''}
            </li>
          ) : null,
        )}
        {flaggedBefore && <li className="fixed">Fixed automatically after an earlier flag</li>}
      </ul>

      {sending ? (
        <div className="sendback">
          <textarea
            autoFocus
            placeholder="What should change?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <div className="actions">
            <button className="secondary" disabled={busy} onClick={() => setSending(false)}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={busy || !note.trim()}
              onClick={() => run(() => sendBack(engine, review._id, note.trim()))}
            >
              Send back
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          <button className="secondary" disabled={busy} onClick={() => setSending(true)}>
            Send back with a note
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => run(() => approve(engine, review._id))}
          >
            Approve
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
