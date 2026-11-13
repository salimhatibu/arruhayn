import type { CollectionConfig } from 'payload'

import { adminOnly, hiddenUnless } from '@/access/roles'

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'language', 'status', 'createdAt'],
    hidden: hiddenUnless('admin'),
    group: 'Publishing',
  },
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'name', type: 'text', maxLength: 120 },
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Arabic', value: 'ar' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending confirmation', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
    },
    { name: 'confirmToken', type: 'text', index: true, admin: { readOnly: true } },
    { name: 'unsubscribeToken', type: 'text', index: true, admin: { readOnly: true } },
    { name: 'confirmedAt', type: 'date', admin: { readOnly: true } },
  ],
}
