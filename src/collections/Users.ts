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
  // Staff sign in with email and password. Cloudflare Access can also sign them in once it is set
  // up on the admin domain (it does nothing until ACCESS_TEAM_DOMAIN and ACCESS_AUD are set).
  auth: {
    tokenExpiration: 60 * 60 * 12,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
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
      admin: { description: 'The email this person signs in with.' },
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
