// Server-side calls to the RealtimeKit REST API. The API token never reaches the browser:
// the browser only receives a participant token for one meeting.

type Rtk = { accountId: string; appId: string; token: string }

function config(): Rtk | null {
  const accountId = process.env.RTK_ACCOUNT_ID
  const appId = process.env.RTK_APP_ID
  const token = process.env.RTK_API_TOKEN
  return accountId && appId && token ? { accountId, appId, token } : null
}

export const realtimeConfigured = () => config() !== null

function request(c: Rtk, path: string, method: string, body?: unknown) {
  return fetch(`https://api.cloudflare.com/client/v4/accounts/${c.accountId}/realtime/kit/${c.appId}${path}`, {
    method,
    headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const c = config()
  if (!c) throw new Error('Live classes are not configured.')
  const res = await request(c, path, body === undefined ? 'GET' : 'POST', body)
  const json = (await res.json().catch(() => ({}))) as { data?: T; success?: boolean; errors?: unknown }
  if (!res.ok || !json.data) throw new Error(`RealtimeKit request failed (${res.status}): ${JSON.stringify(json.errors ?? json)}`)
  return json.data
}

export const presetNames = () => ({
  host: process.env.RTK_HOST_PRESET || 'webinar_presenter',
  viewer: process.env.RTK_VIEWER_PRESET || 'webinar_viewer',
})

// Only the setup check uses this. Cloudflare does not document what the default presets are
// called, so the names the site asks for have to be read back from the app itself.
export async function listPresets(): Promise<string[]> {
  // The reply is undocumented, so accept a bare array or one wrapped under a key.
  const data = await call<unknown>('/presets')
  const list = Array.isArray(data)
    ? data
    : Object.values((data ?? {}) as Record<string, unknown>).find(Array.isArray) ?? []
  return (list as { name?: unknown }[])
    .map((preset) => preset?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
}

export async function createMeeting(title: string): Promise<string> {
  const data = await call<{ id: string }>('/meetings', { title: title.slice(0, 120) })
  return data.id
}

export async function addParticipant(
  meetingId: string,
  name: string,
  preset: 'host' | 'viewer',
  participantId: string,
): Promise<string> {
  const presetName = preset === 'host' ? presetNames().host : presetNames().viewer
  // Cloudflare's own documentation names this field both `token` and `authToken`, so take either.
  const data = await call<{ token?: string; authToken?: string }>(
    `/meetings/${meetingId}/participants`,
    {
      name: name.slice(0, 60),
      preset_name: presetName,
      custom_participant_id: participantId,
    },
  )
  const token = data.token ?? data.authToken
  if (!token) throw new Error('RealtimeKit returned no participant token.')
  return token
}

// Ends the class for everyone still in it. The teacher's browser does the same, but this works even
// when that browser has closed, and it is what puts "This class has ended" in front of listeners.
export async function endSession(meetingId: string): Promise<void> {
  const c = config()
  if (!c) return
  const res = await request(c, `/meetings/${meetingId}/active-session/kick-all`, 'POST')
  if (res.ok) return
  const detail = await res.text().catch(() => '')
  // "No active session" means nobody is in the meeting any more, which is the state this is after.
  // Any other 404, such as a mistyped path, is a real failure and must not pass as success.
  if (res.status === 404 && detail.includes('No active session')) return
  throw new Error(`RealtimeKit could not end the session (${res.status}): ${detail.slice(0, 200)}`)
}
