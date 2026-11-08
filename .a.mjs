import { chromium } from '@playwright/test'
const S = process.argv[2]
const b = await chromium.launch({ executablePath: '/usr/bin/chromium' })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)))
await p.goto('http://localhost:3000/admin', { waitUntil: 'load', timeout: 180000 }); await p.waitForTimeout(5000)
await p.screenshot({ path: `${S}/admin-dash.png` })
await p.goto('http://localhost:3000/admin/collections/fatwas', { waitUntil: 'load', timeout: 180000 }); await p.waitForTimeout(4000)
await p.screenshot({ path: `${S}/admin-list.png` })
await p.goto('http://localhost:3000/admin/collections/fatwas/41', { waitUntil: 'load', timeout: 180000 }); await p.waitForTimeout(4000)
await p.screenshot({ path: `${S}/admin-doc.png` })
console.log(errs.join('\n') || 'no errors')
await b.close()
