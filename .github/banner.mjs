import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * builds the readme banner, one file per theme. writes a self-contained banner.html and
 * screenshots it twice with puppeteer.
 *
 * png rather than svg: github will not load a webfont for an svg in a readme. the type is
 * the app's own system stack, so nothing has to be embedded.
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
    --bond: #3a3a3a;
    --node: #6b6b6b;
  }

  html[data-theme='light'] {
    --bg: #fafaf9;
    --fg: #171717;
    --muted: #6b7280;
    --accent: #14b8a6;
    --bond: #d8d8d4;
    --node: #a3a3a0;
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
      <g stroke="var(--bond)" stroke-width="2">
        <path d="M215 62 L262 89 L262 143 L215 170 L168 143 L168 89 Z"/>
        <path d="M215 62 V27"/>
        <path d="M262 143 L301 165"/>
        <path d="M168 143 L129 165"/>
      </g>

      <!-- inner lines on alternating edges, the way an aromatic ring is drawn -->
      <g stroke="var(--bond)" stroke-width="2">
        <path d="M255 96 V136"/>
        <path d="M211 71 L175 92"/>
        <path d="M212 161 L176 140"/>
      </g>

      <g fill="var(--bg)" stroke="var(--node)" stroke-width="2">
        <circle cx="215" cy="62" r="6"/>
        <circle cx="262" cy="89" r="6"/>
        <circle cx="262" cy="143" r="6"/>
        <circle cx="215" cy="170" r="6"/>
        <circle cx="168" cy="143" r="6"/>
        <circle cx="168" cy="89" r="6"/>
        <circle cx="301" cy="165" r="6"/>
        <circle cx="129" cy="165" r="6"/>
      </g>

      <circle cx="215" cy="27" r="7" fill="var(--accent)"/>
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
