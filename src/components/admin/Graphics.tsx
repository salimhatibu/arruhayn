// The admin uses the same text wordmark as the public site.

export function Logo() {
  return (
    <span className="admin-wordmark">
      <span className="admin-wordmark-ar" lang="ar">
        الرُّحَين
      </span>
      <span className="admin-wordmark-en">Arruhayn · Staff</span>
    </span>
  )
}

export function Icon() {
  return (
    <span className="admin-icon" lang="ar">
      ر
    </span>
  )
}
