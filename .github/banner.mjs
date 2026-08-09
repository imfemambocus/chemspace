import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * builds the readme banner, one file per theme. writes a self-contained banner.html and
 * screenshots it twice with puppeteer.
 *
 * png rather than svg: github will not load a webfont for an svg in a readme, and the
 * bloom around the atoms is a real filter rather than something flat shapes can fake.
 * the type is the app's own system stack, so nothing has to be embedded.
 *
 *   npm install --no-save puppeteer && node .github/banner.mjs
 */

const HERE = dirname(fileURLToPath(import.meta.url))

const W = 1280
const H = 360

const page = `<!doctype html>
<html data-theme="dark"><head><meta charset="utf-8">
<style>
  /* the app's own tokens, so the banner cannot drift from the site */
  html[data-theme='dark'] {
    --bg: #0a0a0a;
    --fg: #ededed;
    --muted: #8a8a8a;
    --accent: #2dd4bf;
    --atom: #ededed;
  }

  html[data-theme='light'] {
    --bg: #fafaf9;
    --fg: #171717;
    --muted: #6b7280;
    --accent: #14b8a6;
    --atom: #262626;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: ${W}px;
    height: ${H}px;
    background: var(--bg);
    color: var(--fg);
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 76px;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  .left { display: flex; flex-direction: column; gap: 22px; }
  .brand { display: flex; align-items: center; gap: 13px; }
  .brand svg { width: 30px; height: 30px; color: var(--accent); }
  .brand span { font-size: 37px; font-weight: 600; letter-spacing: -0.035em; }
  .brand .tail { color: var(--accent); }
  .tagline { font-size: 17px; line-height: 1.5; color: var(--muted); max-width: 25ch; }
  .eyebrow {
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .motif { width: 430px; height: 240px; flex: none; position: relative; }
  .motif svg { width: 100%; height: 100%; }
</style></head><body>
  <div class="left">
    <div class="brand">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <g stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
          <circle cx="16" cy="16" r="5.5"/>
          <ellipse cx="16" cy="16" rx="13.5" ry="6" transform="rotate(-30 16 16)"/>
        </g>
      </svg>
      <span>Chem<span class="tail">Space</span></span>
    </div>
    <p class="tagline">Real 3D molecular structures, straight from a PubChem CID.</p>
    <p class="eyebrow">React Three Fiber &nbsp;&middot;&nbsp; PubChem &nbsp;&middot;&nbsp; Vite</p>
  </div>

  <div class="motif">
    <svg viewBox="0 0 430 240" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </radialGradient>
        <filter id="bloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <ellipse cx="215" cy="120" rx="190" ry="118" fill="url(#glow)"/>

      <g stroke="var(--accent)" stroke-width="5" stroke-linecap="round">
        <line x1="215" y1="66" x2="262" y2="93"/>
        <line x1="262" y1="93" x2="262" y2="147"/>
        <line x1="262" y1="147" x2="215" y2="174"/>
        <line x1="215" y1="174" x2="168" y2="147"/>
        <line x1="168" y1="147" x2="168" y2="93"/>
        <line x1="168" y1="93" x2="215" y2="66"/>
        <line x1="215" y1="66" x2="215" y2="31"/>
        <line x1="262" y1="147" x2="301" y2="169"/>
        <line x1="168" y1="147" x2="129" y2="169"/>
      </g>

      <g filter="url(#bloom)">
        <circle cx="215" cy="66" r="9" fill="var(--atom)"/>
        <circle cx="262" cy="93" r="9" fill="var(--atom)"/>
        <circle cx="262" cy="147" r="9" fill="var(--atom)"/>
        <circle cx="215" cy="174" r="9" fill="var(--atom)"/>
        <circle cx="168" cy="147" r="9" fill="var(--atom)"/>
        <circle cx="168" cy="93" r="9" fill="var(--atom)"/>
        <circle cx="215" cy="31" r="11" fill="#ff4d4d"/>
        <circle cx="301" cy="169" r="10.5" fill="#5b7bff"/>
        <circle cx="129" cy="169" r="11" fill="var(--accent)"/>
      </g>
    </svg>
  </div>
</body></html>
`

const html = resolve(HERE, 'banner.html')
writeFileSync(html, page)

const require = createRequire(join(process.cwd(), '/'))
let puppeteer
try {
  puppeteer = require('puppeteer')
} catch {
  console.log('puppeteer not installed. open .github/banner.html and screenshot it, or:')
  console.log('  npm install --no-save puppeteer && node .github/banner.mjs')
  process.exit(0)
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const tab = await browser.newPage()
await tab.setViewport({ width: W, height: H, deviceScaleFactor: 2 })
await tab.goto('file://' + html, { waitUntil: 'networkidle0' })

for (const theme of ['dark', 'light']) {
  await tab.evaluate((value) => {
    document.documentElement.dataset.theme = value
  }, theme)
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path: resolve(HERE, `banner-${theme}.png`) })
  console.log(`wrote .github/banner-${theme}.png`)
}

await browser.close()
