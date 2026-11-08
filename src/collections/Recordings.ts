import type { CollectionConfig } from 'payload'

import { allow, hasRole, hiddenUnless, ownOrAdmin } from '@/access/roles'

export const Recordings: CollectionConfig = {
  slug: 'recordings',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'teacher', 'status', 'publishedAt'],
    hidden: hiddenUnless('admin', 'teacher'),
    group: 'Classes',
    description: 'Upload a recording from your computer. Recordings only appear in the library once published.',
  },
  defaultSort: '-publishedAt',
  access: {
    read: ({ req }) => {
      if (hasRole(req.user, 'admin')) return true
      if (hasRole(req.user, 'teacher')) {
        return { or: [{ status: { equals: 'published' } }, { teacher: { equals: req.user?.id } }] }
      }
      return { status: { equals: 'published' } }
    },
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
    { name: 'class', type: 'relationship', relationTo: 'classes' },
    { name: 'topics', type: 'relationship', relationTo: 'topics', hasMany: true },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'ar',
      options: [
        { label: 'Arabic', value: 'ar' },
        { label: 'English', value: 'en' },
        { label: 'Both', value: 'both' },
      ],
    },
    {
      name: 'upload',
      type: 'ui',
      admin: { components: { Field: '@/components/admin/AudioUpload#AudioUpload' } },
    },
    { name: 'fileKey', type: 'text', required: true, admin: { readOnly: true, description: 'Set by the upload above.' } },
    { name: 'mimeType', type: 'text', admin: { readOnly: true } },
    { name: 'sizeBytes', type: 'number', admin: { readOnly: true } },
    { name: 'durationSeconds', type: 'number', admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'inFeed', label: 'Include in the RSS feed', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'publishedAt', type: 'date', index: true, admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        if (operation === 'create' && !hasRole(req.user, 'admin') && req.user) data.teacher = req.user.id
        if (data.status === 'published' && originalDoc?.status !== 'published') {
          data.publishedAt = data.publishedAt ?? new Date().toISOString()
        }
        return data
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        // Remove the audio file from storage along with the record.
        const { getCloudflareContext } = await import('@opennextjs/cloudflare')
        const { env } = await getCloudflareContext({ async: true })
        if (doc.fileKey) await env.R2.delete(doc.fileKey).catch((err: unknown) => req.payload.logger.error(err))
      },
    ],
  },
}
