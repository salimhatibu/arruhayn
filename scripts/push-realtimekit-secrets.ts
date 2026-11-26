// Copies the three RTK_ values from .env onto both production Workers. Live classes need them on
// both: the teacher's room is on the admin Worker, and students join through the public one.
//
//   pnpm rtk:secrets
//
// Run pnpm rtk:check first — this pushes whatever is in .env without testing it. The values go to
// wrangler over a pipe, so they never appear in the command or in shell history. Secrets take
// effect without a redeploy.
import { spawn } from 'node:child_process'

const NAMES = ['RTK_ACCOUNT_ID', 'RTK_APP_ID', 'RTK_API_TOKEN'] as const
const ENVS = ['admin', 'public'] as const

const missing = NAMES.filter((name) => !process.env[name])
if (missing.length) {
  console.error(`Not in .env yet: ${missing.join(', ')}. See docs/SETUP.md section 2.`)
  process.exit(1)
}

// Pipes one value to `wrangler secret put` so it is never an argument.
function put(name: string, value: string, env: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['wrangler', 'secret', 'put', name, '--env', env], {
      stdio: ['pipe', 'inherit', 'inherit'],
    })
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`wrangler exited with ${code} setting ${name} on ${env}`)),
    )
    child.stdin.end(value)
  })
}

function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) return resolve(process.env.RTK_SECRETS_YES === '1')
    process.stdout.write(question)
    process.stdin.setEncoding('utf8')
    process.stdin.once('data', (chunk) => {
      process.stdin.pause()
      resolve(String(chunk).trim().toLowerCase() === 'yes')
    })
    process.stdin.resume()
  })
}

console.log(`About to set ${NAMES.join(', ')} on the live Workers: arruhayn-admin and arruhayn.`)
console.log(`The values come from .env. Run pnpm rtk:check first if you have not.\n`)
if (!(await confirm('Type yes to go ahead: '))) {
  console.log('Nothing was changed.')
  process.exit(0)
}

for (const env of ENVS) {
  for (const name of NAMES) {
    await put(name, process.env[name]!, env)
    console.log(`  ${name} set on ${env}`)
  }
}
console.log('\nDone. Open a class in the admin and use "Open the live room" to try it.')
process.exit(0)
