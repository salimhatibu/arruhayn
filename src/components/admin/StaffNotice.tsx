// Shown on the admin login screen. Staff never type a password: Cloudflare Access signs them in,
// so reaching this screen means their email isn't set up as staff yet.
export function StaffNotice() {
  return (
    <div style={{ maxWidth: 420, lineHeight: 1.6 }}>
      <h2 style={{ marginBottom: 8 }}>Your email isn&apos;t set up as staff yet</h2>
      <p>
        You signed in through Cloudflare Access, but there&apos;s no staff account with that email. Ask an
        admin to add you under Settings → Staff, then reload this page.
      </p>
    </div>
  )
}
