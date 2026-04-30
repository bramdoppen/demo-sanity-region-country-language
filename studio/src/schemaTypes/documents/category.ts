import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: (doc: Record<string, unknown>) => {
          const titleArray = doc.title as {_key: string; value: string}[] | undefined
          const enValue = titleArray?.find((t) => t._key.startsWith('nl'))?.value
          return enValue || titleArray?.[0]?.value || ''
        },
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'parent',
      title: 'Parent Category',
      type: 'reference',
      to: [{type: 'category'}],
      options: {
        filter: ({document}) => ({
          filter: '_id != $id',
          params: {id: document._id.replace(/^drafts\./, '')},
        }),
      },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      parentTitle: 'parent.title',
    },
    prepare({title, parentTitle}) {
      const localizedTitle =
        title?.find((t: {_key: string; value: string}) => t._key.startsWith('nl'))?.value ||
        title?.[0]?.value ||
        'Untitled'

      const localizedParent =
        parentTitle?.find((t: {_key: string; value: string}) => t._key.startsWith('nl'))?.value ||
        parentTitle?.[0]?.value

      return {
        title: localizedTitle,
        subtitle: localizedParent ? `↳ ${localizedParent}` : undefined,
      }
    },
  },
})
