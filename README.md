# demo-sanity-region-country-language

A demo Sanity Studio setup that organizes content through a **Region → Country → Language** hierarchy, using multi-workspace and document internationalization.

## What this demo shows

### Content hierarchy

Content is structured as documents in Sanity, forming a three-level hierarchy:

- **Region** (e.g. EU, US) — top-level grouping
- **Country** (e.g. Netherlands, France) — belongs to a region, references one or more locales
- **Locale** (e.g. `nl`, `fr`, `en`) — a language identifier

Pages are assigned a `locale` field in the format `{country}_{locale}` (e.g. `nl_nl`, `nl_en`, `fr_fr`). This ties every page to a specific country and language combination.

### Multi-workspace Studio

The Studio is configured with **two workspaces** (`/eu` and `/us`), one per region. Each workspace uses a custom desk structure that:

1. Fetches the region and its countries/locales from the dataset
2. Builds a navigation tree: **Region → Country → Language**
3. Filters page lists at each level so editors only see content relevant to their scope
4. Pre-fills the `locale` field when creating new pages from a language node

### Document internationalization

Uses [`@sanity/document-internationalization`](https://github.com/sanity-io/document-internationalization) with languages fetched dynamically from the content (country + locale documents), rather than a hardcoded list.

A custom **FilteredLanguageMenu** component replaces the default language filter for pages. It scopes the translation menu to only show languages available in the same country as the current document — so a Dutch page only shows `nl_nl` and `nl_en`, not `fr_fr`.

### Locale-scoped slug uniqueness

The `page` schema uses a custom `isUnique` function on the slug field that checks uniqueness per locale, allowing the same slug to exist across different country/language combinations.

### AI-powered translation

[Sanity AI Assist](https://www.sanity.io/ai-assist) is configured for translating page documents between languages within the same country.

## Project structure

```
├── studio/                     # Sanity Studio
│   ├── sanity.config.ts        # Multi-workspace config (EU + US)
│   ├── src/
│   │   ├── schemaTypes/
│   │   │   ├── documents/
│   │   │   │   ├── region.ts   # Region document type
│   │   │   │   ├── country.ts  # Country (belongs to region, has locales)
│   │   │   │   ├── locale.ts   # Locale (language identifier)
│   │   │   │   └── page.ts     # Page (with locale + page builder)
│   │   │   └── ...
│   │   ├── structure/
│   │   │   └── index.ts        # Custom desk structure (region → country → language)
│   │   └── components/
│   │       └── FilteredLanguageMenu.tsx  # Country-scoped translation menu
│   └── ...
└── frontend/                   # Next.js app
```

## Getting started

### 1. Install dependencies

```shell
npm install
```

### 2. Configure environment variables

```shell
cp studio/.env.example studio/.env
cp frontend/.env.example frontend/.env.local
```

Fill in your Sanity project ID and dataset in both files.

### 3. Run locally

```shell
npm run dev
```

- Next.js: [http://localhost:3000](http://localhost:3000)
- Sanity Studio: [http://localhost:3333](http://localhost:3333)

### 4. Set up content

Create a few **Region**, **Country**, and **Locale** documents in the Studio first. For example:

| Region | Country     | Locales    |
| ------ | ----------- | ---------- |
| EU     | Netherlands | `nl`, `en` |
| EU     | France      | `fr`, `en` |
| US     | USA         | `en`, `es` |

Then switch to the EU or US workspace and start creating pages — they will be scoped to the correct region, country, and language.

## Paxon Question Desk demo

Every customer question makes the help content better. A question from the chatbot or contact centre lands in the Question Desk, gets checked against the Paxon Knowledge Base, and if the help content is missing or outdated, an FAQ change is drafted, translated into NL, FR and DE, checked against the brand guidelines and reviewed before it is published.

| Folder           | What it is                                                               |
| ---------------- | ------------------------------------------------------------------------ |
| `studio/`        | FAQ, brand guideline and customer question schemas, Workflows plugin     |
| `workflows/`     | Workflow definitions, effect handlers, seed/reset scripts, local drainer |
| `question-desk/` | App SDK app: inbox, question detail, "For me" review list                |

The two workflows:

- **FAQ localization** (`workflows/definitions/faq-localization.ts`): spawns one `faq-language` subworkflow per language. Each one translates with Agent Actions, runs a brand check and a consistency check, fixes itself when flagged, and goes to review. Languages whose brand guideline has "Always needs a human reviewer" (FR and DE) go to the named reviewer; the others are approved automatically. When all languages are approved, everything is published.
- **Question to FAQ** (`workflows/definitions/question-to-faq.ts`): extracts signals, asks the Knowledge Base whether the question is answered, outdated or missing (with citations), drafts the FAQ change and hands it to the FAQ localization workflow.

Questions come in two ways: seeded ones, and live ones from the help chat at `/help`. The chat searches the Knowledge Base over MCP, answers with Agent Actions, and records every conversation (including the Knowledge Base tool calls) with [Insights](https://www.sanity.io/docs/ai/sanity-context-insights). Classification scores each conversation and lists content gaps; every conversation with a gap becomes a new customer question in the Question Desk.

Brand guidelines (formality, tone, terms to use/avoid, human-review requirement) and the glossary are edited in the Studio under **Paxon (demo)**; the translation and check prompts read them at run time.

### Setup

```shell
npm install
cp workflows/.env.example workflows/.env   # fill in tokens and reviewer user IDs
npm run seed                                # FAQs, brand guidelines, glossary, questions + translations
npm run wf:deploy                           # deploy the workflow definitions
```

Set up the Knowledge Base and MCP endpoint as described in [`workflows/KNOWLEDGE_BASE.md`](workflows/KNOWLEDGE_BASE.md). Until then, `KB_REHEARSAL=true` lets you rehearse against the FAQs directly.

The help chat and the Insights classification both run on Agent Actions, so no separate LLM key is needed. Add the organization token (role **Context Editor**) to `frontend/.env.local` as `SANITY_ORGANIZATION_TOKEN` and to `workflows/.env` as `SANITY_CONTEXT_TOKEN`. To run classification on a schedule, deploy the blueprint once:

```shell
npx sanity blueprints init . --type ts --stack-name production --organization-id objVdfY4N
npx sanity functions env add classify-conversations SANITY_ORGANIZATION_TOKEN <org token>
npx sanity blueprints deploy
```

### Running

```shell
npm run dev            # frontend, Studio (3333) and Question Desk (3334)
npm run drain          # runs the automatic workflow steps; add -- --step to pause before each step
npm run reset          # back to a clean demo state
```

Other cues: `npm run insights` classifies help-chat conversations now instead of waiting for the hourly Function, `npm run ask -- 2` checks question 2 from the terminal, `npm run localize -- <faqId>` localizes any FAQ, `npm run kb:ask -- "question"` queries the Knowledge Base, and `npm run translate -- --all` bulk translates.

See [`workflows/RECORDING_SCRIPT.md`](workflows/RECORDING_SCRIPT.md) for the click-through and [`workflows/REAL_VS_SCAFFOLDING.md`](workflows/REAL_VS_SCAFFOLDING.md) for what is production-shaped and what is demo scaffolding.

## Resources

- [Sanity documentation](https://www.sanity.io/docs)
- [Document Internationalization plugin](https://github.com/sanity-io/document-internationalization)
- [Sanity AI Assist](https://www.sanity.io/ai-assist)
