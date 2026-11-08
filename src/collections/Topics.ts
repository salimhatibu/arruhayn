import type { CollectionConfig } from 'payload'

import { anyone, contentStaff, hiddenUnless } from '@/access/roles'

export const Topics: CollectionConfig = {
  slug: 'topics',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order'],
    hidden: hiddenUnless('admin', 'reviewer'),
    group: 'Fatwas',
  },
  defaultSort: 'order',
  access: { read: anyone, create: contentStaff, update: contentStaff, delete: contentStaff },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'description', type: 'textarea', localized: true },
    { name: 'order', type: 'number', defaultValue: 100 },
    {
      name: 'searchWords',
      type: 'text',
      hasMany: true,
      admin: { description: 'Other words that should find this topic, for example "dowry" for mahr.' },
    },
    { name: 'related', type: 'relationship', relationTo: 'topics', hasMany: true },
  ],
}
