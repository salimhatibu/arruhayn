import type { CollectionConfig } from 'payload'

import { anyone, contentStaff, hiddenUnless } from '@/access/roles'

export const Scholars: CollectionConfig = {
  slug: 'scholars',
  admin: { useAsTitle: 'name', hidden: hiddenUnless('admin', 'reviewer'), group: 'Fatwas' },
  access: { read: anyone, create: contentStaff, update: contentStaff, delete: contentStaff },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'bio', type: 'textarea', localized: true },
  ],
}
