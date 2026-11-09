import type { ServerProps } from 'payload'

export function NavWelcome({ user }: ServerProps) {
  const name = user ? (user as { name?: string }).name || user.email : ''
  const roles = ((user as { roles?: string[] } | undefined)?.roles ?? []).join(' · ')
  if (!user) return null
  return (
    <div className="nav-welcome">
      <span className="nav-welcome-avatar" aria-hidden="true">
        {name.trim().charAt(0).toUpperCase()}
      </span>
      <span className="nav-welcome-text">
        <span className="nav-welcome-name">{name}</span>
        {roles ? <span className="nav-welcome-roles">{roles}</span> : null}
      </span>
    </div>
  )
}
