import type { CollectionConfig } from 'payload'

import { allow, hasRole, hiddenUnless, ownOrAdmin } from '@/access/roles'

export const Classes: CollectionConfig = {
  slug: 'classes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'speaker', 'startsAt', 'status', 'attendance'],
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
      name: 'speaker',
      type: 'text',
      localized: true,
      admin: {
        description: 'The name shown on the site, such as a guest scholar. They need no account. Left empty, the teacher\'s name is used.',
      },
    },
    {
      name: 'teacher',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      filterOptions: { roles: { contains: 'teacher' } },
      defaultValue: ({ user }) => user?.id,
      access: { update: ({ req }) => hasRole(req.user, 'admin') },
      admin: { description: 'The staff member who hosts the live room.' },
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
      name: 'allowRecording',
      label: 'Listeners may record',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Shows listeners a Record button that saves the class to their own device. The teacher can also change this when starting the class, or during it.',
      },
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
    // Filled in by the live room: when the class actually ran, and how many came.
    {
      name: 'startedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, HH:mm' },
        description: 'When the teacher started the class.',
      },
    },
    {
      name: 'endedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, HH:mm' },
        description: 'When it was ended.',
      },
    },
    {
      name: 'liveMinutes',
      label: 'Minutes live',
      type: 'number',
      admin: { position: 'sidebar', readOnly: true, description: 'How long it ran, from start to end.' },
    },
    {
      name: 'attendance',
      label: 'People who joined',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Everyone who joined from the site, each counted once however often they reconnected. The teacher is not counted.',
      },
    },
  ],
  hooks: {
    // The database refuses to delete a class anything still points at. Attendance rows go with the
    // class; questions asked in it are kept, since they can still be answered, and only unlinked.
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({ collection: 'class-joins', where: { class: { equals: id } }, overrideAccess: true, req })
        await req.payload.update({ collection: 'questions', where: { class: { equals: id } }, data: { class: null }, overrideAccess: true, req })
      },
    ],
    beforeChange: [
      ({ data, req, operation }) => {
        // A teacher can only schedule classes for themselves.
        if (operation === 'create' && !hasRole(req.user, 'admin') && req.user) data.teacher = req.user.id
        return data
      },
    ],
  },
}
