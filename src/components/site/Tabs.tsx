'use client'

import { useId, useState, type ReactNode } from 'react'

// Tabs over panels that are already rendered on the server. Arrow keys move between tabs.
export function Tabs({ tabs, label }: { tabs: { key: string; label: string; panel: ReactNode }[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.key)
  const id = useId()
  const move = (from: number, step: number) => {
    const next = tabs[(from + step + tabs.length) % tabs.length]
    setActive(next.key)
    document.getElementById(`${id}-tab-${next.key}`)?.focus()
  }
  return (
    <div className="tabs">
      <div className="tab-list" role="tablist" aria-label={label}>
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            id={`${id}-tab-${tab.key}`}
            role="tab"
            type="button"
            aria-selected={active === tab.key}
            aria-controls={`${id}-panel-${tab.key}`}
            tabIndex={active === tab.key ? 0 : -1}
            onClick={() => setActive(tab.key)}
            onKeyDown={(e) => {
              const rtl = document.dir === 'rtl'
              if (e.key === 'ArrowRight') move(i, rtl ? -1 : 1)
              if (e.key === 'ArrowLeft') move(i, rtl ? 1 : -1)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          id={`${id}-panel-${tab.key}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tab.key}`}
          hidden={active !== tab.key}
          className="tab-panel"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  )
}
