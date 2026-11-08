// The icon bar at the bottom of the admin sidebar (log out sits beside it).
const ICONS = {
  site: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z',
  account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  questions: 'M4 6h16v12H4V6Zm0 0 8 7 8-7',
}

function Glyph({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export function NavFooter() {
  const site = `${process.env.PUBLIC_URL ?? ''}/en`
  return (
    <div className="nav-footer">
      <a href={site} target="_blank" rel="noopener noreferrer" title="View the site" aria-label="View the site">
        <Glyph d={ICONS.site} />
      </a>
      <a href="/admin/collections/questions" title="Questions" aria-label="Questions">
        <Glyph d={ICONS.questions} />
      </a>
      <a href="/admin/account" title="Your account" aria-label="Your account">
        <Glyph d={ICONS.account} />
      </a>
    </div>
  )
}
