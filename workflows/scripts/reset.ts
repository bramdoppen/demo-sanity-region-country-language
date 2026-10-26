/**
 * Puts the demo back to its starting state before a recording.
 *
 *   npm run reset             delete demo content + workflow state, re-seed from cache
 *   npm run reset -- --fresh  same, but re-translate with Agent Actions
 */
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {content} from '../lib/env.ts'
import {restoreTranslations, seedBaseContent} from './seed.ts'

const workflowsDir = fileURLToPath(new URL('..', import.meta.url))

console.log('… removing workflow definitions and instances (partition "demo")')
try {
  execFileSync('npx', ['sanity-workflows', 'nuke', '--deployment', 'demo', '--force'], {
    cwd: workflowsDir,
    stdio: 'inherit',
  })
} catch {
  console.log('  (no workflow state to remove)')
}

const ids = await content.fetch<string[]>(
  `*[string::startsWith(_id, "paxon-") || string::startsWith(_id, "drafts.paxon-") || demoRun == true]._id`,
)
const tx = content.transaction()
for (const id of ids) tx.delete(id)
await tx.commit()
console.log(`✓ removed ${ids.length} demo documents`)

await seedBaseContent()
if (process.argv.includes('--fresh') || !(await restoreTranslations())) {
  execFileSync('node', ['--env-file=.env', 'scripts/seed.ts', '--fresh'], {cwd: workflowsDir, stdio: 'inherit'})
}

console.log('… redeploying workflow definitions')
execFileSync('npx', ['sanity-workflows', 'deploy', '--no-share-defs'], {cwd: workflowsDir, stdio: 'inherit'})
console.log('Demo reset. Next: npm run drain -- --step')
