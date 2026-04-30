import {defineField, defineType} from 'sanity'
import {BlockElementIcon} from '@sanity/icons'

export const bannerCard = defineType({
  name: 'bannerCard',
  title: 'Banner Card',
  type: 'document',
  icon: BlockElementIcon,
  fields: [
    defineField({
      name: 'cardTitle',
      title: 'Card Title',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'cardSubtitle',
      title: 'Card Subtitle',
      type: 'internationalizedArrayString',
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
    }),
    defineField({
      name: 'componentDescription',
      title: 'Component Description',
      type: 'internationalizedArrayText',
    }),
  ],
  preview: {
    select: {
      title: 'cardTitle',
      media: 'image',
    },
    prepare({title}) {
      const localizedTitle =
        title?.find((t: {language: string; value: string}) => t.language.startsWith('nl'))?.value ||
        title?.[0]?.language.startsWith('nl')?.value ||
        'Untitled'

      return {
        title: localizedTitle,
      }
    },
  },
})
