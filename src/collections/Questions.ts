import type { CollectionConfig } from 'payload'

import { contentStaff, hiddenUnless } from '@/access/roles'

// Questions sent through the public "ask a question" form, or asked during a live class. They are
// private: only admins and reviewers can read them (a class's teacher sees that class's questions
// through the live room), and they are deleted 90 days after being answered. A live question the
// teacher didn't get to stays here as New, so it can still become a fatwa.
export const Questions: CollectionConfig = {
  slug: 'questions',
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'class', 'language', 'status', 'createdAt'],
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
      name: 'class',
      label: 'Asked during',
      type: 'relationship',
      relationTo: 'classes',
      index: true,
      admin: { position: 'sidebar', readOnly: true, description: 'The live class it was asked in, if any.' },
    },
    { name: 'askedBy', type: 'text', admin: { position: 'sidebar', readOnly: true, description: 'The name they joined the class with.' } },
    // The listener's random browser id, used only to stop one person flooding the teacher.
    { name: 'visitor', type: 'text', index: true, admin: { hidden: true } },
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
    beforeChange: [
      ({ data, originalDoc }) => {
        // The 90-day deletion clock starts when a question is answered or declined.
        if ((data.status === 'answered' || data.status === 'declined') && originalDoc?.status !== data.status) {
          data.answeredAt = data.answeredAt ?? new Date().toISOString()
        }
        return data
      },
    ],
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
