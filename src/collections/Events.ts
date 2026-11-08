import type { CollectionConfig } from 'payload'

import { adminOnly, hiddenUnless } from '@/access/roles'
import { HIJRI_MONTHS } from '@/lib/hijri'

// Custom calendar events. Classes, Islamic dates, and Sunnah fasts appear on the calendar
// automatically, so this is only for anything else.
export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'dateType', 'gregorianDate'],
    hidden: hiddenUnless('admin'),
    group: 'Calendar',
    description: 'Classes, Islamic dates, and Sunnah fasts are added to the calendar automatically.',
  },
  access: { read: () => true, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'description', type: 'textarea', localized: true },
    {
      name: 'dateType',
      type: 'select',
      required: true,
      defaultValue: 'gregorian',
      options: [
        { label: 'A fixed date', value: 'gregorian' },
        { label: 'A Hijri date every year', value: 'hijri' },
      ],
    },
    {
      name: 'gregorianDate',
      type: 'date',
      admin: { condition: (_, s) => s.dateType === 'gregorian' },
    },
    {
      name: 'hijriMonth',
      type: 'select',
      options: HIJRI_MONTHS.en.map((m, i) => ({ label: m, value: String(i + 1) })),
      admin: { condition: (_, s) => s.dateType === 'hijri' },
    },
    { name: 'hijriDay', type: 'number', min: 1, max: 30, admin: { condition: (_, s) => s.dateType === 'hijri' } },
  ],
}
