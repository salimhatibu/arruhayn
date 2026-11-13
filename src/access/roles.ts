import type { Access, ClientUser, PayloadRequest } from 'payload'

export const ROLES = ['admin', 'reviewer', 'teacher'] as const
export type Role = (typeof ROLES)[number]

type MaybeUser = { id?: number | string; roles?: Role[] | null } | ClientUser | null | undefined

export function hasRole(user: MaybeUser, ...roles: Role[]): boolean {
  const userRoles = (user as { roles?: Role[] | null } | null | undefined)?.roles
  return Boolean(userRoles?.some((r) => roles.includes(r)))
}

export const allow =
  (...roles: Role[]): Access =>
  ({ req }) =>
    hasRole(req.user, ...roles)

// Fatwas, questions, newsletters, news, guides, glossary, scholars, and topics.
export const contentStaff = allow('admin', 'reviewer')
export const adminOnly = allow('admin')
export const anyone: Access = () => true

// Visitors see published items only; the given roles see everything.
export const publishedOr =
  (...roles: Role[]): Access =>
  ({ req }) =>
    hasRole(req.user, ...roles) ? true : { status: { equals: 'published' } }

// Teachers only see and change their own classes and recordings.
export const ownOrAdmin: Access = ({ req }) => {
  if (hasRole(req.user, 'admin')) return true
  if (hasRole(req.user, 'teacher')) return { teacher: { equals: req.user?.id } }
  return false
}

// Hides a collection from the admin sidebar for everyone without one of the roles.
export const hiddenUnless =
  (...roles: Role[]) =>
  ({ user }: { user: ClientUser }) =>
    !hasRole(user, ...roles)

export function requireRole(req: PayloadRequest, ...roles: Role[]) {
  if (!hasRole(req.user, ...roles)) throw new Error('You do not have permission to do this.')
}
