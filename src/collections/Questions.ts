import type { CollectionConfig } from 'payload'

import { contentStaff, hiddenUnless } from '@/access/roles'

// Questions sent through the public "ask a question" form. They are private: only admins and
// reviewers can read them, and they are deleted 90 days after being answered.
export const Questions: CollectionConfig = {
  slug: 'questions',
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'language', 'status', 'createdAt'],
    hidden: hiddenUnless('admin', 'reviewer'),
    group: 'Fatwas',
    description: 'Tick "Create a draft fatwa" and save to start an answer from a question.',
  },
  defaultSort: '-createdAt',
  access: {
    read: contentStaff,
    // Visitors submit through /svc/questions, which checks Turnstile first.
    create: () => false,
    update: contentStaff,
    delete: contentStaff,
  },
  fields: [
    { name: 'question', type: 'textarea', required: true, admin: { readOnly: true } },
    {
      name: 'language',
      type: 'select',
      required: true,
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Arabic', value: 'ar' },
      ],
    },
    { name: 'email', type: 'email', admin: { description: 'Optional. Only used to tell the person their question was answered.' } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Draft started', value: 'drafting' },
        { label: 'Answered', value: 'answered' },
        { label: 'Declined', value: 'declined' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'createDraft',
      label: 'Create a draft fatwa from this question',
      type: 'checkbox',
      virtual: true,
      admin: { position: 'sidebar' },
    },
    { name: 'linkedFatwa', type: 'relationship', relationTo: 'fatwas', admin: { position: 'sidebar', readOnly: true } },
    { name: 'answeredAt', type: 'date', index: true, admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    afterChange: [
      async ({ doc, data, req, operation }) => {
        if (operation !== 'update' || !data?.createDraft || doc.linkedFatwa) return doc
        const locale = doc.language === 'ar' ? 'ar' : 'en'
        const fatwa = await req.payload.create({
          collection: 'fatwas',
          locale,
          data: {
            title: doc.question.slice(0, 90),
            question: doc.question,
            status: 'draft',
            fromQuestion: doc.id,
          },
          req,
        })
        return req.payload.update({
          collection: 'questions',
          id: doc.id,
          data: { linkedFatwa: fatwa.id, status: 'drafting' },
          req,
        })
      },
    ],
  },
}
