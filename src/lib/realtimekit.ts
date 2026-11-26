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

async function call<T>(path: string, body?: unknown): Promise<T> {
  const c = config()
  if (!c) throw new Error('Live classes are not configured.')
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${c.accountId}/realtime/kit/${c.appId}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
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
