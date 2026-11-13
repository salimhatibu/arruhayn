'use client'

import { useDocumentInfo } from '@payloadcms/ui'

export function LiveRoomLink() {
  const { id } = useDocumentInfo()
  if (!id) return <p style={{ opacity: 0.7 }}>Save the class to open its live room.</p>
  return (
    <div style={{ marginBottom: 24 }}>
      <a className="btn btn--style-primary btn--size-medium" href={`/teach/${id}`} style={{ display: 'inline-block' }}>
        Open the live room
      </a>
      <p style={{ opacity: 0.7, marginTop: 8 }}>Use desktop Chrome or Edge for screen sharing and recording.</p>
    </div>
  )
}
