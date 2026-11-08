import type { CollectionConfig } from 'payload'

import { contentStaff, hiddenUnless, publishedOr } from '@/access/roles'

export const News: CollectionConfig = {
  slug: 'news',
  labels: { singular: 'News item', plural: 'News' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'status'],
    hidden: hiddenUnless('admin', 'reviewer'),
    group: 'Publishing',
  },
  defaultSort: '-date',
  access: {
    read: publishedOr('admin', 'reviewer'),
    create: contentStaff,
    update: contentStaff,
    delete: contentStaff,
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'summary', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    { name: 'date', type: 'date', required: true, index: true, defaultValue: () => new Date().toISOString() },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
