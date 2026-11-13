import type { GlobalConfig } from 'payload'

import { adminOnly } from '@/access/roles'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: { group: 'Settings', hidden: ({ user }) => !(user?.roles as string[] | undefined)?.includes('admin') },
  access: { read: () => true, update: adminOnly },
  fields: [
    {
      name: 'emailSending',
      label: 'Send newsletter emails',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Leave off until your own domain and email sending are set up.' },
    },
    { name: 'contactEmail', type: 'email' },
    { name: 'disclaimer', type: 'textarea', localized: true },
    { name: 'about', type: 'richText', localized: true },
    { name: 'privacy', type: 'richText', localized: true },
  ],
}
