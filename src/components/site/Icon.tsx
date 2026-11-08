// Line icons drawn on a 24px grid. They inherit the text colour.

const PATHS = {
  search: 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.3-2.2L21 21',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  fatwa: 'M5 4h10l4 4v12H5V4Zm10 0v4h4M8.5 12h7m-7 4h5',
  book: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Zm16 0c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5v-13Z',
  rings: 'M9 20a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm6 0a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM10 6l2-2 2 2',
  scales: 'M12 4v16m-5 0h10M5 7h14M7 7l-3 6a3 3 0 0 0 6 0L7 7Zm10 0-3 6a3 3 0 0 0 6 0l-3-6Z',
  calendar: 'M4 6.5C4 5.7 4.7 5 5.5 5h13c.8 0 1.5.7 1.5 1.5v12c0 .8-.7 1.5-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12ZM4 10h16M8 3v4m8-4v4',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3Zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3Z',
  scroll: 'M7 4h11a2 2 0 0 1 0 4h-1v10a2 2 0 0 1-2 2H6a2 2 0 0 1 0-4h1V4Zm0 12h8m-5-8h4m-4 4h4',
  pen: 'M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Zm10-13 3 3',
  mail: 'M4 6h16v12H4V6Zm0 0 8 7 8-7',
  rss: 'M5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16',
  live: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-4.2 2.2a6 6 0 0 1 0-8.4m8.4 0a6 6 0 0 1 0 8.4M5 19a10 10 0 0 1 0-14m14 0a10 10 0 0 1 0 14',
  news: 'M5 5h11v14H6a1 1 0 0 1-1-1V5Zm11 4h3v9a1 1 0 0 1-2 0V9M8 9h5m-5 3h5m-5 3h3',
  bookmark: 'M6 4h12v16l-6-4-6 4V4Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z',
  heart: 'M12 20s-7.5-4.6-9.2-9.4C1.6 7.3 3.7 4 7 4c2 0 3.3 1 5 3 1.7-2 3-3 5-3 3.3 0 5.4 3.3 4.2 6.6C19.5 15.4 12 20 12 20Z',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
