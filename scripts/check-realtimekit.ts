// Checks that live classes will work before a teacher finds out the hard way. It reads the three
// RTK_ values from .env, lists the app's presets, then actually creates a throwaway meeting and
// joins it as both a host and a viewer — the same calls a real class makes.
//
//   pnpm rtk:check
//
// Nothing is kept: the meeting is left empty and unused. Cloudflare only bills participants who
// join, and these tokens are never used to join.
import { addParticipant, createMeeting, listPresets, presetNames, realtimeConfigured } from '@/lib/realtimekit'

const missing = (['RTK_ACCOUNT_ID', 'RTK_APP_ID', 'RTK_API_TOKEN'] as const).filter((name) => !process.env[name])
if (!realtimeConfigured()) {
  console.error(`Live classes are not set up yet. Add these to .env, then run this again:\n`)
  for (const name of missing) console.error(`  ${name}=`)
  console.error(`\ndocs/SETUP.md section 2 says where each one comes from.`)
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
  // A token without the Realtime permission fails here, before anything is created.
  console.log(`  could not read them: ${err instanceof Error ? err.message : String(err)}`)
  console.log(`  Check that RTK_APP_ID is right and the API token has the Realtime permission.`)
  process.exit(1)
}

// 2. The calls a real class makes, in order. Skipped when the presets are wrong, since every
// join would be refused for that reason and the failure would say nothing new.
if (failed) {
  console.log('\nSkipping the test class until the presets are sorted out.')
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

if (failed) {
  console.log('\nLive classes will not work yet. Fix the above and run this again.')
  process.exit(1)
}
console.log('\nLive classes work. Next: pnpm rtk:secrets, to put these on both Workers.')
process.exit(0)
