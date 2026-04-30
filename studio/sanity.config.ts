import {defineConfig, defineField} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './src/schemaTypes'
import {createStructure} from './src/structure'
import {unsplashImageAsset} from 'sanity-plugin-asset-source-unsplash'
import {assist} from '@sanity/assist'
import {documentInternationalization} from '@sanity/document-internationalization'
import {internationalizedArray} from 'sanity-plugin-internationalized-array'
import {FilteredLanguageMenu} from './src/components/FilteredLanguageMenu'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || '69zhjgro'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: 'Localization demo',

  projectId,
  dataset,

  plugins: [
    structureTool({structure: createStructure}),
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
})
