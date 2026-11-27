import { NotFoundBody } from '@/components/site/NotFoundBody'

// A broken or old link, shown inside the site rather than as a bare error page. This file has to be
// a server component to be used; the language-dependent part is a small client component, because a
// 404 page gets no params and the language has to be read from the address.
export default function NotFound() {
  return <NotFoundBody />
}
