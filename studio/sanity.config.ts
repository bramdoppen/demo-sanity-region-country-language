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
import {StudioLayout, queueToast} from './src/components/ToastBridge'

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

          const arrayField =
            newDocument._type === 'page' ? 'pageBuilder' : 'contentModules'
          const modules = (newDocument as Record<string, unknown>)[arrayField] as
            | {_type: string; _ref?: string; _key: string}[]
            | undefined

          const bannerRefs = (modules || []).filter(
            (m) => m._type === 'reference' && m._ref,
          )

          const missingTitles: string[] = []

          if (bannerRefs.length > 0) {
            const refMap = new Map<string, string>()

            for (const ref of bannerRefs) {
              const sourceRef = ref._ref!
              const result = await client.fetch<{
                translatedId: string | null
                sourceTitle: string | null
              } | null>(
                `*[_type == "translation.metadata"
                  && $sourceRef in translations[].value._ref
                ][0]{
                  "translatedId": translations[language == $lang][0].value._ref,
                  "sourceTitle": *[_id == $sourceRef][0].title
                }`,
                {sourceRef, lang: destinationLanguageId},
              )

              if (result?.translatedId) {
                refMap.set(sourceRef, result.translatedId)
              } else {
                missingTitles.push(result?.sourceTitle || sourceRef)
              }
            }

            const updatedModules = (modules || []).map((m) => {
              if (m._type === 'reference' && m._ref && refMap.has(m._ref)) {
                return {...m, _ref: refMap.get(m._ref)!}
              }
              return m
            })

            patch[arrayField] = updatedModules
          }

          await client
            .patch(docId)
            .set(patch)
            .unset(['slug'])
            .commit()

          if (missingTitles.length > 0) {
            queueToast({
              title: 'Banner Array vertalingen niet gevonden',
              description: `Geen ${destinationLanguageId} vertaling gevonden voor: ${missingTitles.join(', ')}`,
              status: 'warning',
            })
          }
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

    studio: {
      components: {
        layout: StudioLayout,
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
})
