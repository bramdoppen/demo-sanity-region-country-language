# What's real and what's demo scaffolding

## Real (production-shaped)

- **Workflow definitions** (`definitions/`) are deployed to the Workflows engine and run on it: stages, triggers, spawned per-language subworkflows, the all-approved gate, reviewer actions with notes, the fix loop with a retry cap.
- **Agent Actions** do the translation (`translate`), the brand and consistency checks, the fix and the FAQ drafting (`prompt`).
- **Brand guidelines and glossary** are Studio documents. Changing formality, tone, terms or the human-review flag changes the next run, with no code changes.
- **Knowledge Base check** calls the Sanity Context MCP endpoint (`knowledge_base_search` / `knowledge_base_read`) and returns citations to the actual sources.
- **Question Desk** is a real App SDK app using the logged-in user. Approve / send back fire actions on the same engine.
- **Help chat + Insights**: the `/help` chat uses the AI SDK with the Knowledge Base MCP tools and `sanityInsightsIntegration`; conversations are classified with `@sanity/context/insights` in a scheduled Sanity Function, and content gaps become customer questions.
- **Studio** shows the workflow panel on documents through the official Workflows plugin.

## Scaffolding (demo only)

| What                                                                                                        | Why                                                          | Production version                                                 |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Local drainer** (`npm run drain`) runs the automatic steps                                                | Lets you pace the recording with `--step`                    | Sanity Functions / a worker running the same effect handlers       |
| **`DEMO_FLAG_FIRST_FR=true`** makes the first French translation casual (tu) on purpose                     | So the brand check visibly flags and fixes something         | Remove the flag                                                    |
| **`KB_REHEARSAL=true`** classifies against the FAQs + legacy page directly when there's no Context token    | Rehearse before the Knowledge Base exists                    | Ignored once `SANITY_CONTEXT_TOKEN` is set                         |
| **Question status** is mirrored onto the `customerQuestion` document                                        | Simple, live inbox query in the app                          | Read state from the workflow instance                              |
| **"For me"** filters on the reviewer field in the app, not an `$assigned` filter on the engine              | Kept the app small                                           | Engine assignment queries                                          |
| **Most questions are seeded**; chat questions arrive via Insights, and the Check button starts the workflow | No contact-centre integration                                | A CRM webhook; the Function could start "Question to FAQ" directly |
| **`npm run insights`** classifies immediately                                                               | The Function only runs hourly                                | Just the scheduled Function                                        |
| **Help chat page** is a bare page on the demo frontend                                                      | Shows the customer side                                      | The real paxon.com chat widget                                     |
| **Policy details** (30 vs 45 day returns, cut-off times, the 2023 brand page)                               | Content is seeded from paxon.com but the facts are fictional | Real Paxon content                                                 |
