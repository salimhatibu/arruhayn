import { AwsClient } from 'aws4fetch'

// Presigned upload URLs let a teacher's browser upload large recordings straight to R2,
// skipping the Worker's request size limit.

export function presignConfigured() {
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
}

export async function presignPut(key: string, contentType: string, expiresSeconds = 3600): Promise<string> {
  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: 's3',
    region: 'auto',
  })
  const url = new URL(
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET ?? 'arruhayn-media'}/${key}`,
  )
  url.searchParams.set('X-Amz-Expires', String(expiresSeconds))
  const signed = await client.sign(new Request(url, { method: 'PUT', headers: { 'content-type': contentType } }), {
    aws: { signQuery: true },
  })
  return signed.url
}
