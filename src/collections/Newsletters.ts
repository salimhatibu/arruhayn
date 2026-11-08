import type { CollectionConfig } from 'payload'

import { contentStaff, hiddenUnless, publishedOr } from '@/access/roles'
import { indexNewsletter, removeFromIndex } from '@/lib/search-index'

export const Newsletters: CollectionConfig = {
  slug: 'newsletters',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['issue', 'title', 'status', 'publishAt'],
    hidden: hiddenUnless('admin', 'reviewer'),
    group: 'Publishing',
    description: 'Scheduled issues are published on the site automatically. Email sending switches on with your own domain.',
  },
  versions: { maxPerDoc: 25 },
  defaultSort: '-issue',
  access: {
    read: publishedOr('admin', 'reviewer'),
    create: contentStaff,
    update: contentStaff,
    delete: contentStaff,
  },
  fields: [
    { name: 'issue', type: 'number', required: true, unique: true, index: true },
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'summary', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'topics', type: 'relationship', relationTo: 'topics', hasMany: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'For scheduled issues: when it goes live.',
      },
    },
    { name: 'emailedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.status === 'published' && !data.publishAt) data.publishAt = new Date().toISOString()
        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        await indexNewsletter(req.payload, doc.id)
        return doc
      },
    ],
    afterDelete: [({ id, req }) => removeFromIndex(req.payload, 'newsletter', id)],
  },
}
