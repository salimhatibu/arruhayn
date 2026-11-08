import { chromium } from '@playwright/test'
const S = process.argv[2]
const b = await chromium.launch({ executablePath: '/usr/bin/chromium' })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)))
await p.goto('http://localhost:3000/admin', { waitUntil: 'load', timeout: 180000 }); await p.waitForTimeout(6000)
const navOpen = await p.evaluate(() => !!document.querySelector('.template-default--nav-open'))
if (!navOpen) { await p.click('.nav-toggler').catch(() => {}); await p.waitForTimeout(1200) }
await p.screenshot({ path: `${S}/desk-dash.png` })
await p.screenshot({ path: `${S}/desk-dash-full.png`, fullPage: true })
await p.goto('http://localhost:3000/admin/collections/fatwas', { waitUntil: 'load' }); await p.waitForTimeout(4000)
await p.screenshot({ path: `${S}/desk-list.png` })
console.log(errs.join('\n') || 'no errors')
await b.close()
