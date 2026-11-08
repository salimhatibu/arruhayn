import type { CollectionConfig } from 'payload'

import { anyone, contentStaff, hiddenUnless } from '@/access/roles'

export const Glossary: CollectionConfig = {
  slug: 'glossary',
  labels: { singular: 'Glossary term', plural: 'Glossary' },
  admin: {
    useAsTitle: 'term',
    defaultColumns: ['term', 'spellings'],
    hidden: hiddenUnless('admin', 'reviewer'),
    group: 'Publishing',
  },
  defaultSort: 'term',
  access: { read: anyone, create: contentStaff, update: contentStaff, delete: contentStaff },
  fields: [
    { name: 'term', type: 'text', required: true, localized: true },
    {
      name: 'spellings',
      type: 'text',
      hasMany: true,
      admin: { description: 'Other spellings that should show this definition, for example "walee".' },
    },
    { name: 'definition', type: 'textarea', required: true, localized: true },
  ],
}
