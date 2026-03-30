import {CogIcon, EarthGlobeIcon} from '@sanity/icons'
import type {StructureBuilder, StructureResolverContext} from 'sanity/structure'

const API_VERSION = '2024-01-01'

const HIDDEN_TYPES = ['settings', 'assist.instruction.context', 'translation.metadata']

interface Locale {
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

export function createStructure(regionSlug: string) {
  return (S: StructureBuilder, context: StructureResolverContext) => {
    const client = context.getClient({apiVersion: API_VERSION})

    return S.list()
      .title('Content')
      .items([
        S.listItem()
          .title('Pages')
          .icon(EarthGlobeIcon)
          .child(() =>
            client
              .fetch<Region | null>(
                `*[_type == "region" && slug.current == $regionSlug][0]{
                  _id,
                  title,
                  "countries": *[_type == "country" && region._ref == ^._id] | order(title asc) {
                    _id,
                    title,
                    "slug": slug.current,
                    "locales": locales[]->{ localeId, title }
                  }
                }`,
                {regionSlug},
              )
              .then((region) => {
                if (!region) {
                  return S.list().title('No region found').items([])
                }

                return S.list()
                  .title(region.title)
                  .items(
                    region.countries.map((country) =>
                      S.listItem()
                        .title(country.title)
                        .child(
                          S.list()
                            .title(country.title)
                            .items(
                              (country.locales || []).map((loc) => {
                                const localeId = `${country.slug}_${loc.localeId}`
                                return S.listItem()
                                  .title(`${loc.title} (${localeId})`)
                                  .child(
                                    S.documentTypeList('page')
                                      .title(`${country.title} — ${loc.title}`)
                                      .filter('_type == "page" && locale == $locale')
                                      .params({locale: localeId})
                                      .initialValueTemplates([
                                        S.initialValueTemplateItem('page-by-locale', {
                                          locale: localeId,
                                        }),
                                      ]),
                                  )
                              }),
                            ),
                        ),
                    ),
                  )
              }),
          ),

        S.divider(),

        ...S.documentTypeListItems().filter(
          (item: any) =>
            !HIDDEN_TYPES.includes(item.getId()) && item.getId() !== 'page',
        ),

        S.divider(),

        S.listItem()
          .title('Site Settings')
          .child(S.document().schemaType('settings').documentId('siteSettings'))
          .icon(CogIcon),
      ])
  }
}
