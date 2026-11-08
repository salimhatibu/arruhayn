import type { CollectionConfig } from 'payload'

import { adminOnly, hasRole, hiddenUnless, ROLES } from '@/access/roles'
import { cloudflareAccess } from '@/auth/cloudflare-access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Staff member', plural: 'Staff' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'roles'],
    hidden: hiddenUnless('admin'),
    group: 'Settings',
  },
  auth: {
    disableLocalStrategy: true,
    strategies: [cloudflareAccess],
  },
  access: {
    // Everyone signed in can see staff names (for picking a teacher or scholar); only admins edit.
    read: ({ req }) => Boolean(req.user),
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
    admin: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Must match the email this person uses to sign in through Cloudflare Access.' },
      hooks: { beforeChange: [({ value }) => (typeof value === 'string' ? value.toLowerCase() : value)] },
    },
    { name: 'name', type: 'text', required: true },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['teacher'],
      options: ROLES.map((r) => ({ label: r[0].toUpperCase() + r.slice(1), value: r })),
      saveToJWT: true,
      access: { update: ({ req }) => hasRole(req.user, 'admin') },
    },
  ],
}
