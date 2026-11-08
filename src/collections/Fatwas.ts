import type { CollectionConfig } from 'payload'

import { contentStaff, hiddenUnless, publishedOr } from '@/access/roles'
import { indexFatwa, removeFromIndex } from '@/lib/search-index'

export const Fatwas: CollectionConfig = {
  slug: 'fatwas',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['number', 'title', 'status', 'scholar', 'publishedAt'],
    hidden: hiddenUnless('admin', 'reviewer'),
    group: 'Fatwas',
  },
  versions: { maxPerDoc: 25 },
  defaultSort: '-number',
  access: {
    read: publishedOr('admin', 'reviewer'),
    create: contentStaff,
    update: contentStaff,
    delete: contentStaff,
  },
  fields: [
    {
      name: 'number',
      type: 'number',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Filled in automatically when left empty.' },
    },
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'question', type: 'textarea', required: true, localized: true },
    { name: 'answer', type: 'richText', localized: true },
    {
      name: 'topics',
      type: 'relationship',
      relationTo: 'topics',
      hasMany: true,
      index: true,
      validate: (value: unknown, { siblingData }: { siblingData: { status?: string } }) =>
        siblingData?.status === 'published' && !(Array.isArray(value) && value.length)
          ? 'Choose at least one topic before publishing.'
          : true,
    },
    { name: 'scholar', type: 'relationship', relationTo: 'scholars' },
    {
      name: 'sources',
      type: 'array',
      labels: { singular: 'Source', plural: 'Sources' },
      fields: [
        { name: 'reference', type: 'text', required: true, localized: true },
        { name: 'url', type: 'text' },
      ],
    },
    { name: 'originalUrl', type: 'text', admin: { description: 'Link to the original fatwa, if it was published elsewhere.' } },
    { name: 'related', type: 'relationship', relationTo: 'fatwas', hasMany: true },
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
    { name: 'publishedAt', type: 'date', index: true, admin: { position: 'sidebar', readOnly: true } },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar', readOnly: true } },
    { name: 'fromQuestion', type: 'relationship', relationTo: 'questions', admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        if (!data.number && !originalDoc?.number) {
          const last = await req.payload.find({
            collection: 'fatwas',
            sort: '-number',
            limit: 1,
            depth: 0,
            overrideAccess: true,
            req,
          })
          data.number = (last.docs[0]?.number ?? 0) + 1
        }
        // The person who publishes a fatwa is recorded as its reviewer.
        if (data.status === 'published' && originalDoc?.status !== 'published') {
          data.reviewedBy = req.user?.id ?? data.reviewedBy
          data.publishedAt = data.publishedAt ?? new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        await indexFatwa(req.payload, doc.id)
        // Publishing a fatwa made from a question marks that question answered.
        const questionId = typeof doc.fromQuestion === 'object' ? doc.fromQuestion?.id : doc.fromQuestion
        if (questionId && doc.status === 'published' && previousDoc?.status !== 'published') {
          await req.payload.update({
            collection: 'questions',
            id: questionId,
            data: { status: 'answered', answeredAt: new Date().toISOString(), linkedFatwa: doc.id },
            overrideAccess: true,
            req,
          })
        }
        return doc
      },
    ],
    afterDelete: [({ id, req }) => removeFromIndex(req.payload, 'fatwa', id)],
  },
}
