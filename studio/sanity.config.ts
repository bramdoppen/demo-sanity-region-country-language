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
              id: `${country.countrySlug}_${loc.localeId}`,
              title: `${loc.title} (${country.countrySlug}_${loc.localeId})`,
            })),
          )
        },
        schemaTypes: ['page'],
        languageField: 'locale',
        metadataFields: [defineField({name: 'slug', type: 'slug'})],
        apiVersion: '2024-01-01',
      }),
      unsplashImageAsset(),
      assist({
        translate: {
          document: {
            languageField: 'locale',
            documentTypes: ['page'],
          },
        },
      }),
      visionTool(),
    ],

    schema: {
      types: schemaTypes,
      templates: (prev) => [
        ...prev.filter((t) => t.id !== 'page'),
        {
          id: 'page-by-locale',
          title: 'Page',
          schemaType: 'page',
          parameters: [{name: 'locale', type: 'string'}],
          value: (params: {locale: string}) => ({locale: params.locale}),
        },
      ],
    },
  }
}

export default defineConfig([
  createWorkspace('eu', 'EU', 'eu'),
  createWorkspace('us', 'US', 'us'),
])
