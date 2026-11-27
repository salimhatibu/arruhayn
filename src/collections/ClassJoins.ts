import type { CollectionConfig } from 'payload'

import { hasRole } from '@/access/roles'

// One row per person per class, written when someone joins from the site, so a class's attendance
// counts people rather than connections: a listener whose connection drops and who joins again is
// still one person. `visitor` is a random id the browser keeps, not anything about the person.
export const ClassJoins: CollectionConfig = {
  slug: 'class-joins',
  admin: { hidden: true },
  access: {
    read: ({ req }) => hasRole(req.user, 'admin'),
    create: () => false,
    update: () => false,
    delete: ({ req }) => hasRole(req.user, 'admin'),
  },
  indexes: [{ fields: ['class', 'visitor'], unique: true }],
  fields: [
    { name: 'class', type: 'relationship', relationTo: 'classes', required: true, index: true },
    { name: 'visitor', type: 'text', required: true },
  ],
}
