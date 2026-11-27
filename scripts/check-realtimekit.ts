// Checks that live classes will work before a teacher finds out the hard way. It reads the three
// RTK_ values from .env, lists the app's presets, then actually creates a throwaway meeting and
// joins it as both a host and a viewer — the same calls a real class makes. It also says which
// Workers carry the secrets, since a class needs them on both.
//
//   pnpm rtk:check
//
// Nothing is kept: the meeting is left empty and unused. Cloudflare only bills participants who
// join, and these tokens are never used to join.
import { spawn } from 'node:child_process'

import { addParticipant, createMeeting, listPresets, presetNames, realtimeConfigured } from '@/lib/realtimekit'

const NAMES = ['RTK_ACCOUNT_ID', 'RTK_APP_ID', 'RTK_API_TOKEN'] as const
const ENVS = ['admin', 'public'] as const

// Which of the three each Worker carries. Only the names come back — Cloudflare never gives a
// secret's value back, which is why the local check needs its own copy in .env.
function workerSecrets(env: string): Promise<string[] | null> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['wrangler', 'secret', 'list', '--env', env], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    let out = ''
    child.stdout.on('data', (chunk) => (out += chunk))
    child.on('error', () => resolve(null))
    child.on('close', (code) => {
      if (code !== 0) return resolve(null)
      try {
        const listed = JSON.parse(out.slice(out.indexOf('['))) as { name?: string }[]
        resolve(listed.map((entry) => entry.name).filter((name): name is string => Boolean(name)))
      } catch {
        resolve(null)
      }
    })
  })
}

async function reportWorkers(): Promise<boolean> {
  console.log('\nThe Workers')
  let allThere = true
  for (const env of ENVS) {
    const secrets = await workerSecrets(env)
    if (!secrets) {
      console.log(`  ${env}: could not ask Cloudflare (is wrangler logged in?)`)
      allThere = false
      continue
    }
    const absent = NAMES.filter((name) => !secrets.includes(name))
    if (absent.length) {
      console.log(`  ${env}: MISSING ${absent.join(', ')}`)
      allThere = false
    } else {
      console.log(`  ${env}: has all three`)
    }
  }
  if (!allThere) {
    console.log(
      `\n  Live classes need all three on both Workers: the teacher's room is on admin, and\n` +
        `  students join through public. Put the values in .env, then run pnpm rtk:secrets.`,
    )
  }
  return allThere
}

const missing = NAMES.filter((name) => !process.env[name])
if (!realtimeConfigured()) {
  console.log(`Not in .env here: ${missing.join(', ')}`)
  console.log(`This check needs its own copy to talk to Cloudflare; secrets already on a Worker`)
  console.log(`cannot be read back. docs/SETUP.md section 2 says where each value comes from.`)
  await reportWorkers()
  process.exit(1)
}

const wanted = presetNames()
let failed = false

// 1. The presets the site asks for have to exist, under exactly these names.
console.log('Presets')
try {
  const presets = await listPresets()
  if (!presets.length) {
    console.log('  Cloudflare listed no presets. Open the RealtimeKit dashboard and add them.')
    failed = true
  } else {
    console.log(`  the app has: ${presets.join(', ')}`)
    for (const [role, name] of [
      ['host', wanted.host],
      ['viewer', wanted.viewer],
    ] as const) {
      if (presets.includes(name)) {
        console.log(`  ${role}: ${name} — found`)
      } else {
        console.log(`  ${role}: ${name} — MISSING`)
        failed = true
      }
    }
    if (failed) {
      console.log(
        `\n  Either rename the presets in the RealtimeKit dashboard to the two names above, or set\n` +
          `  RTK_HOST_PRESET and RTK_VIEWER_PRESET to names the app does have (in .env here, and in\n` +
          `  wrangler.jsonc under both environments' vars).`,
      )
    }
  }
} catch (err) {
  // A token without the Realtime permission fails here, before anything is created. Asking for
  // the account's apps separates the two causes: that call names no app, so if it fails too the
  // token is the problem, and if it succeeds the app id is.
  console.log(`  could not read them: ${err instanceof Error ? err.message : String(err)}`)
  let res: Response | null = null
  try {
    res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.RTK_ACCOUNT_ID}/realtime/kit/apps`,
      { headers: { authorization: `Bearer ${process.env.RTK_API_TOKEN}` } },
    )
  } catch {
    res = null
  }
  if (!res) {
    console.log(`  Could not reach Cloudflare at all. Check the connection and try again.`)
  } else if (res.ok) {
    console.log(`  The token works, so RTK_APP_ID is wrong: it is not an app on this account.`)
    console.log(`  Copy it from the RealtimeKit dashboard.`)
  } else {
    console.log(`  The token reaches Cloudflare but not RealtimeKit (${res.status}), so it is`)
    console.log(`  missing the Realtime permission. Edit it under My Profile -> API Tokens and`)
    console.log(`  add Account -> Realtime (or Realtime Admin), or make a new token with it.`)
  }
  process.exit(1)
}

// 2. The calls a real class makes, in order. Skipped when the presets are wrong, since every
// join would be refused for that reason and the failure would say nothing new.
if (failed) {
  console.log('\nSkipping the test class until the presets are sorted out.')
  await reportWorkers()
  console.log('\nLive classes will not work yet. Fix the above and run this again.')
  process.exit(1)
}

console.log('\nA test class')
try {
  const meetingId = await createMeeting(`Setup check ${new Date().toISOString()}`)
  console.log(`  created a meeting: ${meetingId}`)
  for (const [role, preset] of [
    ['host (the teacher)', 'host'],
    ['viewer (someone listening)', 'viewer'],
  ] as const) {
    const token = await addParticipant(meetingId, 'Setup check', preset, `check-${preset}-${Date.now()}`)
    // The token itself is a credential for that meeting, so only its length is shown.
    console.log(`  ${role}: joined, got a token of ${token.length} characters`)
  }
} catch (err) {
  console.log(`  failed: ${err instanceof Error ? err.message : String(err)}`)
  failed = true
}

const workersReady = await reportWorkers()

if (failed) {
  console.log('\nLive classes will not work yet. Fix the above and run this again.')
  process.exit(1)
}
if (!workersReady) {
  console.log('\nThese values work, but the Workers do not all have them yet: pnpm rtk:secrets.')
  process.exit(1)
}
console.log('\nLive classes work, and both Workers have the secrets.')
process.exit(0)
