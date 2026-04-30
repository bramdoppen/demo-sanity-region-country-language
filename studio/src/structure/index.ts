import {
  CogIcon,
  HomeIcon,
  StarIcon,
  InlineElementIcon,
  BlockElementIcon,
  PinIcon,
  TranslateIcon,
  DocumentIcon,
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
  locales: Locale[]
}

interface Region {
  _id: string
  title: string
  countries: Country[]
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
  region: Region,
) {
  const allPrefixes = region.countries.flatMap((c) =>
    (c.locales || []).map((l) => `${l.localeId}-${c.slug}`),
  )

  const items: ReturnType<StructureBuilder['listItem']>[] = []

  items.push(
    S.listItem()
      .title('All languages')
      .child(
        S.documentTypeList(typeName)
          .title(`${typeTitle} - All languages`)
          .filter(`_type == "${typeName}" && language in $locales`)
          .params({locales: allPrefixes})
          .initialValueTemplates([]),
      ),
  )

  items.push(S.divider().title('By country') as any)

  for (const country of region.countries) {
    const locales = country.locales || []
    const isMultiLang = locales.length > 1

    for (const loc of locales) {
      const language = `${loc.localeId}-${country.slug}`
      const title = isMultiLang
        ? `${country.title} (${loc.localeId})`
        : country.title
      items.push(
        S.listItem()
          .id(`${typeName}-${language}`)
          .title(title)
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

function fetchRegion(client: ReturnType<StructureResolverContext['getClient']>, regionSlug: string) {
  return client.fetch<Region | null>(
    `*[_type == "region" && slug.current == $regionSlug][0]{
      _id,
      title,
      "countries": *[_type == "country" && region._ref == ^._id] | order(title asc) {
        _id,
        title,
        "slug": slug.current,
        "locales": locales[]->{ _id, localeId, title }
      }
    }`,
    {regionSlug},
  )
}

export function createStructure(regionSlug: string) {
  return (S: StructureBuilder, context: StructureResolverContext) => {
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
          fetchRegion(client, regionSlug).then((region) => {
            if (!region) {
              return S.list().title('No region found').items([])
            }
            return createFlatLocalizedList(S, typeName, typeTitle, templateId, region)
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
                                '_type == "bannerCard" && count(cardTitle) < $totalLanguages',
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
                                  '_type == "bannerCard" && !($language in cardTitle[]._key)',
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

        S.divider().title('Inspiration') as any,

        localizedSection(
          'Inspiration Landing Pages',
          DocumentIcon,
          'page',
          'Inspiration Landing Pages',
          'page-by-language',
        ),

        S.divider().title('Banners') as any,

        localizedSection(
          'Banner Arrays',
          InlineElementIcon,
          'bannerArray',
          'Banner Arrays',
          'bannerArray-by-language',
        ),

        bannerCardsSection(),

        S.divider().title('Configuration') as any,

        S.listItem()
          .title('Country')
          .icon(PinIcon)
          .child(S.documentTypeList('country').title('Countries')),

        S.listItem()
          .title('Locale')
          .icon(TranslateIcon)
          .child(S.documentTypeList('locale').title('Locales')),

        S.listItem()
          .title('Site Settings')
          .icon(CogIcon)
          .child(S.document().schemaType('settings').documentId('siteSettings')),
      ])
  }
}
