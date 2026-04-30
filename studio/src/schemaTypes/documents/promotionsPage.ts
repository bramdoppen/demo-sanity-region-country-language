import {defineField, defineType} from 'sanity'
import {StarIcon} from '@sanity/icons'
import {localeFields} from '../shared/localeFields'

export const promotionsPage = defineType({
  name: 'promotionsPage',
  title: 'Promotions Page',
  type: 'document',
  icon: StarIcon,
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
            `count(*[_type == "promotionsPage" && slug.current == $slug && country->slug.current == $countrySlug && locale->localeId == $localeId && !(_id in [$id, $draftId])])`,
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
      validation: (Rule) => Rule.required(),
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
      name: 'contentModules',
      title: 'Content Modules',
      type: 'array',
      of: [
        {type: 'reference', to: [{type: 'bannerArray'}]},
        {type: 'callToAction'},
        {type: 'infoSection'},
      ],
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
