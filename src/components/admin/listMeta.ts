// What each collection's list page shows above the table: an icon and a one-line description.

export const LIST_ICONS: Record<string, string> = {
  fatwas: 'M5 4h10l4 4v12H5V4Zm10 0v4h4M8.5 12h7m-7 4h5',
  topics: 'M4 7h7l2 2h7v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z',
  scholars: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  questions: 'M4 6h16v12H4V6Zm0 0 8 7 8-7',
  newsletters: 'M5 5h11v14H6a1 1 0 0 1-1-1V5Zm11 4h3v9a1 1 0 0 1-2 0V9M8 9h5m-5 3h5m-5 3h3',
  news: 'M4 11h3l7-5v12l-7-5H4v-2Zm13-3a5 5 0 0 1 0 8',
  guides: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Zm16 0c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5v-13Z',
  glossary: 'M5 19 10 5l5 14M7 14h6m4-5h3m-3 4h3',
  classes: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-4.2 2.2a6 6 0 0 1 0-8.4m8.4 0a6 6 0 0 1 0 8.4',
  recordings: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3Zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3Z',
  events: 'M4 6.5C4 5.7 4.7 5 5.5 5h13c.8 0 1.5.7 1.5 1.5v12c0 .8-.7 1.5-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12ZM4 10h16M8 3v4m8-4v4',
  'hijri-months': 'M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4Z',
  subscribers: 'M16 19a4 4 0 0 0-8 0m4-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a3 3 0 0 0 3-3m-3 9h3',
  media: 'M4 5h16v14H4V5Zm0 11 5-5 4 4 3-3 4 4M15 9h.01',
  users: 'M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 7a6 6 0 0 1 12 0m2-9a3 3 0 1 0 0-6m2 15a6 6 0 0 0-3-5',
}

export const LIST_DESCRIPTIONS: Record<string, string> = {
  fatwas: 'Questions and answers on marriage. A fatwa needs at least one topic before it can be published.',
  topics: 'The marriage topics that fatwas, recordings, and newsletters are filed under.',
  scholars: 'The people of knowledge whose answers appear on the site. Name and short bio only.',
  questions: 'Questions sent in by visitors. Private: names are never published. Turn one into a draft fatwa from its page.',
  newsletters: 'Newsletter issues. Schedule one and it publishes itself at the chosen time.',
  news: 'Short announcements for the news page.',
  guides: 'Step-by-step marriage guides, including the nikah checklist.',
  glossary: 'Terms explained in pop-ups wherever they appear in fatwas and newsletters.',
  classes: 'Live classes. Teachers start them from the live room; students join from the site.',
  recordings: 'Audio from past classes for the library. Upload, then publish.',
  events: 'Islamic dates and occasions shown on the calendar and in its feeds.',
  'hijri-months': 'Month starts confirmed by moon sighting. These override the Umm al-Qura calendar.',
  subscribers: 'People signed up for the newsletter.',
  media: 'Images and files used on the site.',
  users: 'Staff accounts and their roles: admin, reviewer, or teacher.',
}
