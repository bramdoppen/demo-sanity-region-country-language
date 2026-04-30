import {
  HomeIcon,
  StarIcon,
  InlineElementIcon,
  BlockElementIcon,
  PinIcon,
  TranslateIcon,
  WarningOutlineIcon,
  TagIcon,
} from '@sanity/icons'
import type {StructureBuilder, StructureResolverContext} from 'sanity/structure'

const API_VERSION = '2024-01-01'

interface Locale {
  _id: string
  localeId: string
  title: string
}

interface Country {
  _id: string
  title: string
  slug: string
  emoji?: string
  locales: Locale[]
}

interface Language {
  id: string
  title: string
}

interface CategoryDoc {
  _id: string
  title: {_key: string; value: string}[]
}

function fetchLanguages(
  client: ReturnType<StructureResolverContext['getClient']>,
): Promise<Language[]> {
  return client
    .fetch<{countrySlug: string; locales: {localeId: string; title: string}[]}[]>(
      `*[_type == "country"]{
        "countrySlug": slug.current,
        "locales": locales[]->{ localeId, title }
      }`,
    )
    .then((countries) =>
      countries.flatMap((c) =>
        (c.locales || []).map((l) => ({
          id: `${l.localeId}-${c.countrySlug}`,
          title: `${l.title} (${l.localeId}-${c.countrySlug})`,
        })),
      ),
    )
}

function getCategoryTitle(title: {_key: string; value: string}[] | undefined): string {
  if (!title || title.length === 0) return 'Untitled'
  const nl = title.find((t) => t._key.startsWith('nl'))
  return nl?.value || title[0]?.value || 'Untitled'
}

function createFlatLocalizedList(
  S: StructureBuilder,
  typeName: string,
  typeTitle: string,
  templateId: string,
  countries: Country[],
) {
  const allPrefixes = countries.flatMap((c) =>
    (c.locales || []).map((l) => `${l.localeId}-${c.slug}`),
  )

  const items: ReturnType<StructureBuilder['listItem']>[] = []

  items.push(
    S.listItem()
      .title('All languages')
      .icon(() => '🌍' as any)
      .child(
        S.documentTypeList(typeName)
          .title(`${typeTitle} - All languages`)
          .filter(`_type == "${typeName}" && language in $locales`)
          .params({locales: allPrefixes})
          .initialValueTemplates([]),
      ),
  )

  items.push(S.divider().title('By country') as any)

  for (const country of countries) {
    const locales = country.locales || []
    const isMultiLang = locales.length > 1

    for (const loc of locales) {
      const language = `${loc.localeId}-${country.slug}`
      const label = isMultiLang
        ? `${country.title} (${loc.localeId})`
        : country.title
      const flag = country.emoji
      const listItem = S.listItem()
        .id(`${typeName}-${language}`)
        .title(label)
        .icon(flag ? () => flag as any : undefined as any)
      items.push(
        listItem
          .child(
            S.documentTypeList(typeName)
              .title(`${country.title} — ${loc.title}`)
              .filter(`_type == "${typeName}" && language == $language`)
              .params({language})
              .initialValueTemplates([
                S.initialValueTemplateItem(templateId, {
                  language,
                  countryId: country._id,
                  localeDocId: loc._id,
                }),
              ]),
          ),
      )
    }
  }

  return S.list().title(typeTitle).items(items)
}

function fetchCountries(client: ReturnType<StructureResolverContext['getClient']>) {
  return client.fetch<Country[]>(
    `*[_type == "country"] | order(title asc) {
      _id,
      title,
      emoji,
      "slug": slug.current,
      "locales": locales[]->{ _id, localeId, title }
    }`,
  )
}

export function createStructure(S: StructureBuilder, context: StructureResolverContext) {
  const client = context.getClient({apiVersion: API_VERSION})

  const localizedSection = (
    title: string,
    icon: typeof HomeIcon,
    typeName: string,
    typeTitle: string,
    templateId: string,
  ) =>
    S.listItem()
      .title(title)
      .icon(icon)
      .child(() =>
        fetchCountries(client).then((countries) => {
          if (!countries.length) {
            return S.list().title('No countries found').items([])
          }
          return createFlatLocalizedList(S, typeName, typeTitle, templateId, countries)
        }),
      )

    const bannerCardsSection = () =>
      S.listItem()
        .title('Banner Cards')
        .icon(BlockElementIcon)
        .child(() =>
          Promise.all([
            client.fetch<CategoryDoc[]>(
              `*[_type == "category"] | order(title[0].value asc) { _id, title }`,
            ),
            fetchLanguages(client),
          ]).then(([categories, languages]) =>
            S.list()
              .title('Banner Cards')
              .items([
                S.listItem()
                  .title('All Banner Cards')
                  .icon(BlockElementIcon)
                  .child(S.documentTypeList('bannerCard').title('All Banner Cards')),

                S.listItem()
                  .title('Banner Cards by Category')
                  .icon(TagIcon)
                  .child(
                    S.list()
                      .title('Banner Cards by Category')
                      .items(
                        categories.map((cat) =>
                          S.listItem()
                            .id(cat._id)
                            .title(getCategoryTitle(cat.title))
                            .child(
                              S.documentTypeList('bannerCard')
                                .title(getCategoryTitle(cat.title))
                                .filter('_type == "bannerCard" && category._ref == $categoryId')
                                .params({categoryId: cat._id})
                                .initialValueTemplates([]),
                            ),
                        ),
                      ),
                  ),

                S.listItem()
                  .title('Banner Cards Missing Translations')
                  .icon(WarningOutlineIcon)
                  .child(
                    S.list()
                      .title('Banner Cards Missing Translations')
                      .items([
                        S.listItem()
                          .title('All Missing Translations')
                          .child(
                            S.documentTypeList('bannerCard')
                              .title('All Missing Translations')
                              .filter(
                                '_type == "bannerCard" && (count(cardTitle[defined(value)]) < $totalLanguages || count(cardSubtitle[defined(value)]) < $totalLanguages)',
                              )
                              .params({totalLanguages: languages.length})
                              .initialValueTemplates([]),
                          ),
                        S.divider() as any,
                        ...languages.map((lang) =>
                          S.listItem()
                            .title(`Missing ${lang.title}`)
                            .child(
                              S.documentTypeList('bannerCard')
                                .title(`Missing ${lang.title}`)
                                .filter(
                                  '_type == "bannerCard" && (!($language in cardTitle[].language) || !($language in cardSubtitle[].language))',
                                )
                                .params({language: lang.id})
                                .initialValueTemplates([]),
                            ),
                        ),
                      ]),
                  ),
              ]),
          ),
        )

    const pagesMissingTranslations = () =>
      S.listItem()
        .title('Pages Missing Translations')
        .icon(WarningOutlineIcon)
        .child(() =>
          fetchLanguages(client).then((languages) =>
            S.list()
              .title('Pages Missing Translations')
              .items([
                S.listItem()
                  .title('All Missing Translations')
                  .child(
                    S.documentTypeList('page')
                      .title('All Pages Missing Translations')
                      .filter(
                        `_type == "page" && (
                          _id in *[_type == "translation.metadata" && count(translations) < $totalLanguages].translations[].value._ref
                          || !(_id in *[_type == "translation.metadata"].translations[].value._ref)
                        )`,
                      )
                      .params({totalLanguages: languages.length})
                      .initialValueTemplates([]),
                  ),
                S.divider() as any,
                ...languages.map((lang) =>
                  S.listItem()
                    .title(`Missing ${lang.title}`)
                    .child(
                      S.documentTypeList('page')
                        .title(`Pages Missing ${lang.title}`)
                        .filter(
                          `_type == "page" && _id in *[_type == "translation.metadata" && !($language in translations[]._key)].translations[].value._ref`,
                        )
                        .params({language: lang.id})
                        .initialValueTemplates([]),
                    ),
                ),
              ]),
          ),
        )

    interface CategoryResult {
      _id: string
      title: {_key: string; value: string}[]
      parentId: string | null
    }

    const categoriesSection = () =>
      S.listItem()
        .title('Categories')
        .icon(TagIcon)
        .child(() =>
          client
            .fetch<CategoryResult[]>(
              `*[_type == "category"] | order(title[0].value asc) {
                _id,
                title,
                "parentId": parent._ref
              }`,
            )
            .then((categories) => {
              const topLevel = categories.filter((c) => !c.parentId)
              const childrenOf = (parentId: string) =>
                categories.filter((c) => c.parentId === parentId)

              const buildCategoryItem = (cat: CategoryResult): ReturnType<StructureBuilder['listItem']> => {
                const children = childrenOf(cat._id)
                const catTitle = getCategoryTitle(cat.title)
                const item = S.listItem().id(cat._id).title(catTitle).icon(TagIcon)

                if (children.length > 0) {
                  return item.child(
                    S.list()
                      .title(catTitle)
                      .items([
                        S.listItem()
                          .id(`${cat._id}-doc`)
                          .title(`Edit ${catTitle}`)
                          .child(S.document().schemaType('category').documentId(cat._id)),
                        S.divider() as any,
                        ...children.map(buildCategoryItem),
                      ]),
                  )
                }

                return item.child(S.document().schemaType('category').documentId(cat._id))
              }

              return S.list()
                .title('Categories')
                .items([
                  S.listItem()
                    .title('All Categories')
                    .icon(() => '📋' as any)
                    .child(S.documentTypeList('category').title('All Categories')),
                  S.divider().title('By parent') as any,
                  ...topLevel.map(buildCategoryItem),
                ])
            }),
        )

    return S.list()
      .title('Content')
      .items([
        localizedSection('Home Page', HomeIcon, 'page', 'Home Page', 'page-by-language'),
        localizedSection(
          'Promotions Page',
          StarIcon,
          'promotionsPage',
          'Promotions Page',
          'promotionsPage-by-language',
        ),
        pagesMissingTranslations(),

        S.divider().title('Banners') as any,

        localizedSection(
          'Banner Arrays',
          InlineElementIcon,
          'bannerArray',
          'Banner Arrays',
          'bannerArray-by-language',
        ),

        bannerCardsSection(),

        S.divider().title('Categories') as any,

        categoriesSection(),

        S.divider().title('Configuration') as any,

        S.listItem()
          .title('Country')
          .icon(PinIcon)
          .child(S.documentTypeList('country').title('Countries')),

        S.listItem()
          .title('Locale')
          .icon(TranslateIcon)
          .child(S.documentTypeList('locale').title('Locales')),
      ])
}
