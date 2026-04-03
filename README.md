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

| Region | Country     | Locales       |
|--------|-------------|---------------|
| EU     | Netherlands | `nl`, `en`    |
| EU     | France      | `fr`, `en`    |
| US     | USA         | `en`, `es`    |

Then switch to the EU or US workspace and start creating pages — they will be scoped to the correct region, country, and language.

## Resources

- [Sanity documentation](https://www.sanity.io/docs)
- [Document Internationalization plugin](https://github.com/sanity-io/document-internationalization)
- [Sanity AI Assist](https://www.sanity.io/ai-assist)
