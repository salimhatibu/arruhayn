import type { CollectionConfig } from 'payload'

import { allow, anyone } from '@/access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Publishing' },
  access: {
    read: anyone,
    create: allow('admin', 'reviewer', 'teacher'),
    update: allow('admin', 'reviewer'),
    delete: allow('admin'),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
    },
  ],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
  hooks: {
    afterRead: [
      ({ doc }) => {
        // Files are served by the public Worker's /media route rather than Payload's /api.
        if (doc?.filename) doc.url = `/media/${encodeURIComponent(doc.filename)}`
        return doc
      },
    ],
  },
}
