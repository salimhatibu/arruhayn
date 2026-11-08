import type { CollectionConfig } from 'payload'

import { anyone, contentStaff, hiddenUnless } from '@/access/roles'
import { HIJRI_MONTHS } from '@/lib/hijri'

// Confirmed month starts after moon sighting. They override the Umm al-Qura calculation for the
// date strip, the calendar, and every calendar feed.
export const HijriMonths: CollectionConfig = {
  slug: 'hijri-months',
  labels: { singular: 'Month start', plural: 'Hijri month corrections' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'start'],
    hidden: hiddenUnless('admin', 'reviewer'),
    group: 'Calendar',
    description: 'Add a month here once the moon is sighted, if it starts on a different day from Umm al-Qura.',
  },
  defaultSort: '-start',
  access: { read: anyone, create: contentStaff, update: contentStaff, delete: contentStaff },
  fields: [
    { name: 'year', type: 'number', required: true, min: 1400, max: 1600 },
    {
      name: 'month',
      type: 'select',
      required: true,
      options: HIJRI_MONTHS.en.map((m, i) => ({ label: m, value: String(i + 1) })),
    },
    { name: 'start', type: 'date', required: true, admin: { description: 'The Gregorian date of the 1st of the month.' } },
    { name: 'label', type: 'text', admin: { hidden: true } },
    { name: 'note', type: 'text' },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        data.label = `${HIJRI_MONTHS.en[Number(data.month) - 1]} ${data.year}`
        return data
      },
    ],
  },
}
