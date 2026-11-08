// Shown above the admin login form: a lit-up stage with a glow, two slow orbiting rings and
// drifting embers behind the heading.

const EMBERS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${55 + ((i * 23) % 40)}%`,
  delay: `${(i * 0.7) % 6}s`,
  duration: `${6 + (i % 5)}s`,
}))

export function StaffNotice() {
  return (
    <div className="staff-notice">
      <div className="login-stage" aria-hidden="true">
        <span className="login-glow" />
        <span className="login-ring" />
        <span className="login-ring login-ring-2" />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="login-ember"
            style={{ left: e.left, top: e.top, animationDelay: e.delay, animationDuration: e.duration }}
          />
        ))}
      </div>
      <p className="login-eyebrow">Staff desk · مكتب الموظفين</p>
      <h1 className="login-title">
        Sign in to the <em>desk</em>
      </h1>
      <p className="login-lede">Use the email and password an admin set up for you. After five wrong attempts the account locks for 15 minutes.</p>
    </div>
  )
}
