'use client'

import type { DefaultCellComponentProps } from 'payload'

// The status column as a coloured pill.
export function StatusCell({ cellData, field }: DefaultCellComponentProps) {
  const value = typeof cellData === 'string' ? cellData : ''
  if (!value) return null
  const options = 'options' in field ? (field.options ?? []) : []
  const option = options.find((o) => (typeof o === 'string' ? o : o.value) === value)
  const label = typeof option === 'object' && typeof option.label === 'string' ? option.label : value
  return (
    <span className={`status-pill status-pill--${value}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      {label}
    </span>
  )
}
