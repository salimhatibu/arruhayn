function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5.5 26V15a10.5 10.5 0 0 1 21 0v11" />
      <path d="M9 26v-5.5c2.4-.1 4.8.8 7 2.5 2.2-1.7 4.6-2.6 7-2.5V26c-2.5-.1-4.9.8-7 2.5-2.1-1.7-4.5-2.6-7-2.5Z" />
      <path d="M16.5 4v3m-1.5-1.5h3" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="admin-wordmark">
      <span className="admin-wordmark-mark">
        <BrandMark />
      </span>
      <span className="admin-wordmark-ar" lang="ar">
        الرُّحَين
      </span>
      <span className="admin-wordmark-en">Arruhayn · Staff</span>
    </span>
  )
}

export function Icon() {
  return (
    <span className="admin-icon">
      <span className="admin-icon-mark">
        <BrandMark />
      </span>
      <span className="admin-icon-ar" lang="ar">
        الرُّحَين
      </span>
    </span>
  )
}
