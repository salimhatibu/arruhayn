import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig, type CollectionConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'

import { Classes } from './collections/Classes'
import { Events } from './collections/Events'
import { Fatwas } from './collections/Fatwas'
import { Glossary } from './collections/Glossary'
import { Guides } from './collections/Guides'
import { HijriMonths } from './collections/HijriMonths'
import { Media } from './collections/Media'
import { News } from './collections/News'
import { Newsletters } from './collections/Newsletters'
import { Questions } from './collections/Questions'
import { Recordings } from './collections/Recordings'
import { Scholars } from './collections/Scholars'
import { Subscribers } from './collections/Subscribers'
import { Topics } from './collections/Topics'
import { Users } from './collections/Users'
import { LIST_DESCRIPTIONS } from './components/admin/listMeta'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => {
  try {
    return fs.existsSync(value) ? fs.realpathSync(value) : undefined
  } catch {
    return undefined
  }
}

const isCLI = process.argv.some((value) => {
  const resolved = realpath(value)
  if (!resolved) return false
  return (
    resolved.endsWith(path.join('payload', 'bin.js')) ||
    resolved.endsWith(path.join('next', 'dist', 'bin', 'next'))
  )
})
const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as any // Use PayloadLogger type when it's exported

// Every collection's list page gets the same furniture: an icon and description above the title,
// status tabs with counts and a CSV export above the table, a status pill in the status column,
// and a choice of how many rows to show.
const withListUI = (c: CollectionConfig): CollectionConfig => ({
  ...c,
  admin: {
    ...c.admin,
    description: c.admin?.description ?? LIST_DESCRIPTIONS[c.slug],
    pagination: { defaultLimit: 25, limits: [10, 25, 50, 100, 200] },
    components: {
      ...c.admin?.components,
      beforeList: ['@/components/admin/ListIntro#ListIntro'],
      beforeListTable: ['@/components/admin/StatusTabs#StatusTabs'],
    },
  },
  fields: c.fields.map((f) =>
    'name' in f && f.name === 'status' && f.type === 'select'
      ? {
          ...f,
          admin: {
            ...f.admin,
            components: {
              ...f.admin?.components,
              Cell: '@/components/admin/StatusCell#StatusCell',
            },
          },
        }
      : f,
  ),
})

const cloudflare =
  isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

export default buildConfig({
  serverURL: process.env.SITE_MODE === 'admin' ? process.env.ADMIN_URL : process.env.PUBLIC_URL,
  admin: {
    user: Users.slug,
    theme: 'light',
    // Browser extensions change attributes on <html> before React loads; don't warn about that.
    suppressHydrationWarning: true,
    meta: {
      titleSuffix: ' · Arruhayn staff',
      icons: [{ rel: 'icon', url: '/favicon.ico' }],
    },
    components: {
      beforeLogin: ['@/components/admin/StaffNotice#StaffNotice'],
      beforeNavLinks: ['@/components/admin/NavWelcome#NavWelcome'],
      beforeDashboard: ['@/components/admin/DashboardIntro#DashboardIntro'],
      actions: ['@/components/admin/QuestionsBell#QuestionsBell'],
      graphics: {
        Logo: '@/components/admin/Graphics#Logo',
        Icon: '@/components/admin/Graphics#Icon',
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Fatwas,
    Topics,
    Scholars,
    Questions,
    Newsletters,
    News,
    Guides,
    Glossary,
    Classes,
    Recordings,
    Events,
    HijriMonths,
    Subscribers,
    Media,
    Users,
  ].map(withListUI),
  globals: [SiteSettings],
  localization: {
    locales: [
      { label: 'English', code: 'en' },
      { label: 'العربية', code: 'ar', rtl: true },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  editor: lexicalEditor(),
  auth: { passwordHashIterations: 100_000 },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({
    binding: cloudflare.env.D1,
    // Schema changes always go through migrations. Dev-mode push would try to drop the FTS5
    // search tables, which Payload doesn't know about.
    push: false,
  }),
  logger: isProduction ? cloudflareLogger : undefined,
  plugins: [
    r2Storage({
      bucket: cloudflare.env.R2,
      // Images are stored by filename; class recordings live under recordings/.
      collections: { media: true },
    }),
  ],
})

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}
