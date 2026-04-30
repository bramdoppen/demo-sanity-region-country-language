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
    prepare({title, media}) {
      type LangEntry = {_key: string; value: string; language?: string}
      const entries = (title as LangEntry[] | undefined) || []
      const filled = entries.filter((t) => t.value)
      const total = entries.length

      const localizedTitle =
        filled.find((t) => t.language?.startsWith('nl'))?.value ||
        filled[0]?.value ||
        'Untitled'

      const label = filled.length === 1 ? 'vertaling' : 'vertalingen'
      let subtitle: string
      if (total === 0) {
        subtitle = 'Geen vertalingen'
      } else if (filled.length === total) {
        subtitle = `✓ ${filled.length} ${label}`
      } else {
        subtitle = `✗ ${filled.length}/${total} ${label}`
      }

      return {title: localizedTitle, subtitle, media}
    },
  },
})
