import Link from 'next/link'
import type { ServerProps } from 'payload'

// The top of the admin sidebar: the wordmark, then who is signed in and their roles.
export function NavWelcome({ user }: ServerProps) {
  const name = user ? (user as { name?: string }).name || user.email : ''
  const roles = ((user as { roles?: string[] } | undefined)?.roles ?? []).join(' · ')
  return (
    <>
      <Link className="nav-brand" href="/admin">
        <span className="nav-brand-ar" lang="ar">
          الرُّحَين
        </span>
        <span className="nav-brand-title">Staff desk</span>
      </Link>
      {user ? (
        <div className="nav-welcome">
          <span className="nav-welcome-avatar" aria-hidden="true">
            {name.trim().charAt(0).toUpperCase()}
          </span>
          <span className="nav-welcome-text">
            <span className="nav-welcome-label">Welcome,</span>
            <span className="nav-welcome-name">{name}</span>
            {roles ? <span className="nav-welcome-roles">{roles}</span> : null}
          </span>
        </div>
      ) : null}
    </>
  )
}
