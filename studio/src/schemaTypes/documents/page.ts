import {defineField, defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons'
import {localeFields} from '../shared/localeFields'

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      validation: (Rule) => Rule.required(),
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: async (slug, context) => {
          const {document, getClient} = context
          const client = getClient({apiVersion: '2024-01-01'})
          const id = document?._id.replace(/^drafts\./, '')
          const doc = document as {country?: {_ref?: string}; locale?: {_ref?: string}}
          const countryRef = doc?.country?._ref ?? ''
          const localeRef = doc?.locale?._ref ?? ''
          const count = await client.fetch<number>(
            `count(*[_type == "page" && slug.current == $slug && country->slug.current == $countrySlug && locale->localeId == $localeId && !(_id in [$id, $draftId])])`,
            {
              slug,
              countrySlug: countryRef
                ? await client.fetch(`*[_type == "country" && _id == $ref][0].slug.current`, {ref: countryRef}).then((s) => s ?? '')
                : '',
              localeId: localeRef
                ? await client.fetch(`*[_type == "locale" && _id == $ref][0].localeId`, {ref: localeRef}).then((s) => s ?? '')
                : '',
              id,
              draftId: `drafts.${id}`,
            },
          )
          return count === 0
        },
      },
    }),
    ...localeFields,
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'subheading',
      title: 'Subheading',
      type: 'string',
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page builder',
      type: 'array',
      of: [
        {type: 'reference', to: [{type: 'bannerArray'}]},
        {type: 'callToAction'},
        {type: 'infoSection'},
      ],
      options: {
        insertMenu: {
          views: [
            {
              name: 'grid',
              previewImageUrl: (schemaTypeName) =>
                `/static/page-builder-thumbnails/${schemaTypeName}.webp`,
            },
          ],
        },
      },
    }),
  ],
  preview: {
    select: {title: 'title', language: 'language'},
    prepare({title, language}) {
      return {
        title: title || 'Untitled',
        subtitle: language || '',
      }
    },
  },
})
