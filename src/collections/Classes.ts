import type { CollectionConfig } from 'payload'

import { allow, hasRole, hiddenUnless, ownOrAdmin } from '@/access/roles'

export const Classes: CollectionConfig = {
  slug: 'classes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'teacher', 'startsAt', 'status'],
    hidden: hiddenUnless('admin', 'teacher'),
    group: 'Classes',
    description: 'To teach a class, open it and choose "Open the live room".',
  },
  defaultSort: 'startsAt',
  access: {
    // Everyone can see the schedule; the meeting ID field has its own read rule below.
    read: () => true,
    create: allow('admin', 'teacher'),
    update: ownOrAdmin,
    delete: ownOrAdmin,
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'description', type: 'textarea', localized: true },
    {
      name: 'teacher',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      filterOptions: { roles: { contains: 'teacher' } },
      defaultValue: ({ user }) => user?.id,
      access: { update: ({ req }) => hasRole(req.user, 'admin') },
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'durationMinutes', type: 'number', defaultValue: 90, min: 15, max: 360 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      index: true,
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Live now', value: 'live' },
        { label: 'Ended', value: 'ended' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'meetingId',
      type: 'text',
      admin: { position: 'sidebar', readOnly: true },
      access: { read: ({ req }) => hasRole(req.user, 'admin', 'teacher') },
    },
    {
      name: 'liveRoom',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '@/components/admin/LiveRoomLink#LiveRoomLink' } },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        // A teacher can only schedule classes for themselves.
        if (operation === 'create' && !hasRole(req.user, 'admin') && req.user) data.teacher = req.user.id
        return data
      },
    ],
  },
}
