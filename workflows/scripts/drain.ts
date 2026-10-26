/**
 * Local runtime for the demo: runs queued workflow effects and nudges instances along.
 * Stands in for the Sanity Functions a production setup would deploy.
 *
 *   npm run drain               run continuously
 *   npm run drain -- --step     wait for Enter before each step (for recordings)
 *   npm run drain -- --once     run until idle, then exit
 */
import {createInterface} from 'node:readline/promises'
import {EFFECT_LABELS} from '../effects/index.ts'
import {activeInstances, engine, type InstanceSummary} from '../lib/engine.ts'
import {isRehearsal} from '../lib/kb.ts'

const STEP = process.argv.includes('--step')
const ONCE = process.argv.includes('--once')
const POLL_MS = 2000

const DEFINITION_LABELS: Record<string, string> = {
  'question-to-faq': 'Question',
  'faq-localization': 'FAQ',
  'faq-language': 'Language',
}

const rl = STEP ? createInterface({input: process.stdin, output: process.stdout}) : null
const lastStage = new Map<string, string>()
const names = new Map<string, string>()

const time = () => new Date().toLocaleTimeString('en-GB')
const say = (name: string, message: string) => console.log(`${time()}  ${name.padEnd(12)} ${message}`)

async function nameOf(instance: InstanceSummary): Promise<string> {
  if (!names.has(instance._id)) {
    const kind = DEFINITION_LABELS[instance.definition] ?? instance.definition
    const full = await engine.getInstance({instanceId: instance._id})
    const field = (n: string) => full.fields?.find((f) => f.name === n)?.value
    const suffix =
      instance.definition === 'faq-language'
        ? String(field('language') ?? '').toUpperCase()
        : String((field('subject') as {id?: string} | null)?.id ?? '')
            .split(':')
            .pop()
            ?.replace(/^paxon-(faq|question)-/, '')
    names.set(instance._id, `${kind} ${suffix}`.trim())
  }
  return names.get(instance._id)!
}

function outcome(outputs: Record<string, unknown> | null | undefined): string {
  if (!outputs) return '✓'
  if (typeof outputs.flagged === 'boolean') return outputs.flagged ? `⚑ flagged: ${outputs.reason}` : '✓ passed'
  if (typeof outputs.verdict === 'string') return `✓ ${outputs.verdict}`
  return '✓'
}

async function runPending(instance: InstanceSummary) {
  const name = await nameOf(instance)
  const pending = [...new Set(instance.pending ?? [])]
  const work = pending.map((n) => EFFECT_LABELS[n] ?? n).join(' + ')
  if (rl) await rl.question(`${time()}  ${name.padEnd(12)}   next: ${work}  [Enter]`)
  else say(name, `  ${work}…`)

  const result = await engine.drainEffects({instanceId: instance._id, names: pending})
  const after = await engine.getInstance({instanceId: instance._id})
  for (const effect of result.drained) {
    const entry = [...(after.effectHistory ?? [])].reverse().find((h) => h.name === effect.name)
    say(name, `  ${EFFECT_LABELS[effect.name] ?? effect.name}: ${outcome(entry?.outputs as Record<string, unknown>)}`)
  }
  for (const effect of result.failed) {
    const entry = [...(after.effectHistory ?? [])].reverse().find((h) => h.name === effect.name)
    const reason = (entry as {error?: {message?: string}} | undefined)?.error?.message ?? 'unknown error'
    say(name, `  ✗ ${EFFECT_LABELS[effect.name] ?? effect.name} failed: ${reason}`)
    say(name, `    Fix the cause, then: npx sanity-workflows set-stage ${instance._id} --to ${instance.stage}`)
  }
}

async function loop(): Promise<boolean> {
  let instances = await activeInstances()
  await Promise.all(instances.map((i) => engine.tick({instanceId: i._id})))
  instances = await activeInstances()

  const activeIds = new Set(instances.map((i) => i._id))
  for (const id of [...lastStage.keys()].filter((id) => !activeIds.has(id))) {
    const finished = await engine.getInstance({instanceId: id})
    say(names.get(id) ?? id, `→ ${finished.currentStage} (finished)`)
    lastStage.delete(id)
  }
  for (const instance of instances) {
    if (lastStage.get(instance._id) !== instance.stage) {
      lastStage.set(instance._id, instance.stage)
      say(await nameOf(instance), `→ ${instance.stage}`)
    }
  }

  const busy = instances.filter((i) => i.pending?.length)
  if (rl) for (const instance of busy) await runPending(instance)
  else await Promise.all(busy.map(runPending))
  return busy.length > 0
}

async function main() {
  console.log(STEP ? 'Drainer running in step mode. Press Enter to run each step.' : 'Drainer running.')
  if (isRehearsal()) console.log('Rehearsal mode: the Knowledge Base check reads the FAQs directly (no Context token set).')
  for (;;) {
    const didWork = await loop()
    if (ONCE && !didWork) break
    if (!didWork) await new Promise((r) => setTimeout(r, POLL_MS))
  }
  rl?.close()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
