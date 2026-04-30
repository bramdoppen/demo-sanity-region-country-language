import {defineConfig, defineField, type WorkspaceOptions} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './src/schemaTypes'
import {createStructure} from './src/structure'
import {unsplashImageAsset} from 'sanity-plugin-asset-source-unsplash'
import {
  presentationTool,
  defineDocuments,
  defineLocations,
  type DocumentLocation,
} from 'sanity/presentation'
import {assist} from '@sanity/assist'
import {documentInternationalization} from '@sanity/document-internationalization'
import {internationalizedArray} from 'sanity-plugin-internationalized-array'
import {FilteredLanguageMenu} from './src/components/FilteredLanguageMenu'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'your-projectID'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

const SANITY_STUDIO_PREVIEW_URL =
  process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:3000'

const homeLocation = {
  title: 'Home',
  href: '/',
} satisfies DocumentLocation

function resolveHref(documentType?: string, slug?: string): string | undefined {
  switch (documentType) {
    case 'post':
      return slug ? `/posts/${slug}` : undefined
    case 'page':
      return slug ? `/${slug}` : undefined
    default:
      console.warn('Invalid document type:', documentType)
      return undefined
  }
}

function createWorkspace(
  name: string,
  title: string,
  regionSlug: string,
): WorkspaceOptions {
  return {
    name,
    title,
    basePath: `/${name}`,

    projectId,
    dataset,

    plugins: [
      presentationTool({
        previewUrl: {
          origin: SANITY_STUDIO_PREVIEW_URL,
          previewMode: {
            enable: '/api/draft-mode/enable',
          },
        },
        resolve: {
          mainDocuments: defineDocuments([
            {
              route: '/',
              filter: `_type == "settings" && _id == "siteSettings"`,
            },
            {
              route: '/:slug',
              filter: `_type == "page" && slug.current == $slug || _id == $slug`,
            },
            {
              route: '/posts/:slug',
              filter: `_type == "post" && slug.current == $slug || _id == $slug`,
            },
          ]),
          locations: {
            settings: defineLocations({
              locations: [homeLocation],
              message: 'This document is used on all pages',
              tone: 'positive',
            }),
            page: defineLocations({
              select: {
                title: 'title',
                slug: 'slug.current',
              },
              resolve: (doc) => ({
                locations: [
                  {
                    title: doc?.title || 'Untitled',
                    href: resolveHref('page', doc?.slug)!,
                  },
                ],
              }),
            }),
            post: defineLocations({
              select: {
                title: 'title',
                slug: 'slug.current',
              },
              resolve: (doc) => ({
                locations: [
                  {
                    title: doc?.title || 'Untitled',
                    href: resolveHref('post', doc?.slug)!,
                  },
                  {
                    title: 'Home',
                    href: '/',
                  } satisfies DocumentLocation,
                ].filter(Boolean) as DocumentLocation[],
              }),
            }),
          },
        },
      }),
      structureTool({structure: createStructure(regionSlug)}),
      documentInternationalization({
        supportedLanguages: async (client) => {
          const countries = await client.fetch<
            {countrySlug: string; locales: {localeId: string; title: string}[]}[]
          >(
            `*[_type == "country"]{
              "countrySlug": slug.current,
              "locales": locales[]->{ localeId, title }
            }`,
          )

          return countries.flatMap((country) =>
            (country.locales || []).map((loc) => ({
              id: `${loc.localeId}-${country.countrySlug}`,
              title: `${loc.title} (${loc.localeId}-${country.countrySlug})`,
            })),
          )
        },
        schemaTypes: ['page', 'promotionsPage', 'bannerArray'],
        languageField: 'language',
        hideLanguageFilter: ['page', 'promotionsPage', 'bannerArray'],
        metadataFields: [defineField({name: 'slug', type: 'slug'})],
        apiVersion: '2024-01-01',
        callback: async ({client, destinationLanguageId, newDocument}) => {
          const parts = destinationLanguageId.split('-')
          const localeId = parts[0]
          const countrySlug = parts.slice(1).join('-')

          const resolved = await client.fetch<{
            countryDocId: string | null
            localeDocId: string | null
          }>(
            `{
              "countryDocId": *[_type == "country" && slug.current == $cs][0]._id,
              "localeDocId": *[_type == "locale" && localeId == $li][0]._id
            }`,
            {cs: countrySlug, li: localeId},
          )

          const docId = newDocument._id as string
          const patch: Record<string, unknown> = {slug: undefined}

          if (resolved?.countryDocId) {
            patch.country = {_type: 'reference', _ref: resolved.countryDocId}
          }
          if (resolved?.localeDocId) {
            patch.locale = {_type: 'reference', _ref: resolved.localeDocId}
          }

          await client
            .patch(docId)
            .set(patch)
            .unset(['slug'])
            .commit()
        },
      }),
      internationalizedArray({
        languages: async (client) => {
          const countries = await client.fetch<
            {countrySlug: string; locales: {localeId: string; title: string}[]}[]
          >(
            `*[_type == "country"]{
              "countrySlug": slug.current,
              "locales": locales[]->{ localeId, title }
            }`,
          )

          return countries.flatMap((country) =>
            (country.locales || []).map((loc) => ({
              id: `${loc.localeId}-${country.countrySlug}`,
              title: `${loc.title} (${loc.localeId}-${country.countrySlug})`,
            })),
          )
        },
        fieldTypes: ['string', 'text'],
      }),
      unsplashImageAsset(),
      assist({
        translate: {
          document: {
            languageField: 'language',
            documentTypes: ['page', 'promotionsPage', 'bannerArray'],
          },
          field: {
            languages: async (client) => {
              const countries = await client.fetch<
                {countrySlug: string; locales: {localeId: string; title: string}[]}[]
              >(
                `*[_type == "country"]{
                  "countrySlug": slug.current,
                  "locales": locales[]->{ localeId, title }
                }`,
              )

              return countries.flatMap((country) =>
                (country.locales || []).map((loc) => ({
                  id: `${loc.localeId}-${country.countrySlug}`,
                  title: `${loc.title} (${loc.localeId}-${country.countrySlug})`,
                })),
              )
            },
            documentTypes: ['category', 'bannerCard'],
          },
        },
      }),
      visionTool(),
    ],

    document: {
      unstable_languageFilter: (prev, ctx) => {
        const localizedTypes = ['page', 'promotionsPage', 'bannerArray']
        if (localizedTypes.includes(ctx.schemaType) && ctx.documentId) {
          const documentId = ctx.documentId
          return [
            ...prev,
            (props: {schemaType: import('sanity').ObjectSchemaType}) =>
              FilteredLanguageMenu({...props, documentId}),
          ]
        }
        return prev
      },
    },

    schema: {
      types: schemaTypes,
      templates: (prev) => {
        const managed = ['page', 'promotionsPage', 'bannerArray']
        const titles: Record<string, string> = {
          page: 'Page',
          promotionsPage: 'Promotions Page',
          bannerArray: 'Banner Array',
        }
        return [
          ...prev.filter((t) => !managed.includes(t.id)),
          ...managed.map((type) => ({
            id: `${type}-by-language`,
            title: titles[type] || type,
            schemaType: type,
            parameters: [
              {name: 'language', type: 'string'},
              {name: 'countryId', type: 'string'},
              {name: 'localeDocId', type: 'string'},
            ],
            value: (params: {language: string; countryId: string; localeDocId: string}) => ({
              language: params.language,
              country: {_type: 'reference', _ref: params.countryId},
              locale: {_type: 'reference', _ref: params.localeDocId},
            }),
          })),
        ]
      },
    },
  }
}

export default defineConfig([
  createWorkspace('eu', 'EU', 'eu'),
  createWorkspace('us', 'US', 'us'),
])
