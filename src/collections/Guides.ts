import type { CollectionConfig } from 'payload'

import { contentStaff, hiddenUnless, publishedOr } from '@/access/roles'

export const Guides: CollectionConfig = {
  slug: 'guides',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'status'],
    hidden: hiddenUnless('admin', 'reviewer'),
    group: 'Publishing',
  },
  access: {
    read: publishedOr('admin', 'reviewer'),
    create: contentStaff,
    update: contentStaff,
    delete: contentStaff,
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'article',
      options: [
        { label: 'Article', value: 'article' },
        { label: 'Checklist', value: 'checklist' },
        { label: 'Reading path', value: 'path' },
      ],
    },
    { name: 'summary', type: 'textarea', localized: true },
    { name: 'intro', type: 'richText', localized: true },
    {
      name: 'steps',
      type: 'array',
      labels: { singular: 'Step', plural: 'Steps' },
      fields: [
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'body', type: 'richText', localized: true },
        { name: 'fatwa', type: 'relationship', relationTo: 'fatwas', admin: { description: 'Optional: link this step to a fatwa.' } },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
  ],
}
