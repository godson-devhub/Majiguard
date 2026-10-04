/**
 * Headless-Chrome smoke verification for the MajiGuard frontend.
 * Loads routes, captures console errors, page errors, failed requests,
 * and full-page screenshots in both themes.
 *
 * Usage: node scripts/browser-verify.mjs [baseUrl]
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:5174'
const OUT = 'screenshots'
mkdirSync(OUT, { recursive: true })

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]

function launchChrome(debugPort) {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      const child = spawn(
        candidate,
        [
          '--headless=new',
          `--remote-debugging-port=${debugPort}`,
          '--user-data-dir=' + process.env.TEMP + '/mg-chrome-' + debugPort,
          '--no-first-run',
          '--no-default-browser-check',
          '--window-size=1600,1000',
          'about:blank',
        ],
        { stdio: 'ignore' },
      )
      child.on('error', () => {})
      return child
    } catch {
      // try next candidate
    }
  }
  throw new Error('Chrome not found')
}

async function getWsTarget(port) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (res.ok) {
        const info = await res.json()
        return info.webSocketDebuggerUrl
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw new Error('Chrome DevTools not reachable')
}

const send = (ws, id, method, params = {}) =>
  new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const data = JSON.parse(String(event.data))
      if (data.id === id) {
        ws.removeEventListener('message', onMessage)
        if (data.error) {
          reject(new Error(method + ': ' + JSON.stringify(data.error)))
        } else {
          resolve(data.result)
        }
      }
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id, method, params }))
  })

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const ROUTES = [
  ['dashboard', '/dashboard'],
  ['water-points', '/water-points'],
  ['risk', '/risk'],
  ['impact', '/impact'],
  ['analytics', '/analytics'],
  ['decision-map', '/decision-map'],
  ['priority', '/priority'],
]

const chrome = launchChrome(9333)
try {
  const wsUrl = await getWsTarget(9333)
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve)
    ws.addEventListener('error', reject)
  })

  let msgId = 0
  await send(ws, ++msgId, 'Target.createTarget', { url: 'about:blank' })
  const { targetId } = await send(ws, ++msgId, 'Target.createTarget', {
    url: BASE + '/dashboard',
  })
  const { sessionId } = await send(ws, ++msgId, 'Target.attachToTarget', {
    targetId,
    flatten: true,
  })

  const sessionSend = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++msgId
      const onMessage = (event) => {
        const data = JSON.parse(String(event.data))
        if (data.id === id && data.sessionId === sessionId) {
          ws.removeEventListener('message', onMessage)
          data.error ? reject(new Error(method + ': ' + JSON.stringify(data.error))) : resolve(data.result)
        }
      }
      ws.addEventListener('message', onMessage)
      ws.send(JSON.stringify({ id, method, params, sessionId }))
    })

  await sessionSend('Page.enable')
  await sessionSend('Runtime.enable')
  await sessionSend('Network.enable')
  await sessionSend('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })

  const problems = []

  for (const [theme, themeFlag] of [
    ['light', ''],
    ['dark', 'dark'],
  ]) {
    for (const [name, route] of ROUTES) {
      const consoleMessages = []
      const requestFailures = []
      const requestUrls = new Map()
      const onEvent = (event) => {
        const data = JSON.parse(String(event.data))
        if (data.sessionId !== sessionId) return
        if (data.method === 'Runtime.consoleAPICalled') {
          const type = data.params.type
          if (type === 'error' || type === 'warning') {
            const text = data.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
            consoleMessages.push(`[console.${type}] ${text.slice(0, 300)}`)
          }
        }
        if (data.method === 'Runtime.exceptionThrown') {
          const detail = data.params.exceptionDetails
          consoleMessages.push(`[exception] ${JSON.stringify(detail).slice(0, 400)}`)
        }
        if (data.method === 'Network.requestWillBeSent') {
          requestUrls.set(data.params.requestId, data.params.request.url)
        }
        if (data.method === 'Network.loadingFailed') {
          const requestUrl = requestUrls.get(data.params.requestId) ?? 'unknown-url'
          requestFailures.push(`${data.params.errorText} ${data.params.type} ${requestUrl}`)
        }
      }
      ws.addEventListener('message', onEvent)

      // Pin the theme via localStorage (the same key `ThemeProvider` itself
      // reads - see `src/app/providers/theme-provider.tsx`) and reload, so
      // both the pre-paint bootstrap script in index.html and React's own
      // `readPreferredTheme()` agree on it from the very first paint. Toggling
      // the `dark` class after the fact does not stick: it races React's
      // mount-time `applyTheme` effect, and leaves the toggle UI (driven by
      // React state, not the DOM class) showing the wrong theme regardless -
      // this matters on any machine whose OS-level `prefers-color-scheme` is
      // dark, which otherwise wins every time localStorage has no entry yet.
      const url = BASE + route
      await sessionSend('Page.navigate', { url })
      await wait(800)
      await sessionSend('Runtime.evaluate', {
        expression: `localStorage.setItem('majiguard.theme', '${theme}')`,
      })
      await sessionSend('Page.navigate', { url })
      await wait(name === 'decision-map' ? 8000 : 2500)

      async function evalSafe(expression) {
        try {
          const response = await sessionSend('Runtime.evaluate', { expression, returnByValue: true })
          return response?.result?.value
        } catch {
          return undefined
        }
      }

      const titleValue = await evalSafe('document.title')
      const bodyTextValue = await evalSafe(
        name === 'decision-map'
          ? "document.body.innerText.replace(/\\s+/g,' ').slice(0, 1200)"
          : "document.body.innerText.replace(/\\s+/g,' ').slice(0, 400)",
      )
      const markerCountValue = await evalSafe("document.querySelectorAll('.mg-water-marker').length")
      const clusterCountValue = await evalSafe("document.querySelectorAll('.mg-cluster').length")
      const boundaryPathCountValue = await evalSafe(
        "document.querySelectorAll('.leaflet-overlay-pane path').length",
      )

      const screenshot = await sessionSend('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      writeFileSync(`${OUT}/${theme}-${name}.png`, Buffer.from(screenshot.data, 'base64'))

      const markerNote =
        name === 'dashboard' || name === 'decision-map'
          ? ` markers=${markerCountValue} clusters=${clusterCountValue} boundaryPaths=${boundaryPathCountValue}`
          : ''
      console.log(`[${theme}/${name}] ${titleValue}${markerNote} :: ${String(bodyTextValue).slice(0, 160)}`)
      for (const message of consoleMessages) {
        console.log(`   ${message}`)
      }
      if (requestFailures.length > 0) {
        console.log(`   [network] ${requestFailures.length} failed requests`)
        for (const failure of requestFailures) {
          console.log(`     - ${failure}`)
        }
      }
      problems.push(...consoleMessages)

      // Decision Map specific: the admin boundary layer only renders from
      // zoom 6 upward (country-wide view starts at zoom 5), so click the
      // real zoom-in control a few times and re-check for rendered boundary
      // paths - proof the progressive reveal actually works, not just that
      // the route didn't crash.
      if (name === 'decision-map' && theme === 'light') {
        for (let i = 0; i < 4; i++) {
          await evalSafe("document.querySelector('[aria-label=\"Zoom in\"]')?.click()")
          await wait(500)
        }
        await wait(1500)
        const zoomedBoundaryPathCount = await evalSafe(
          "document.querySelectorAll('.leaflet-overlay-pane path').length",
        )
        const zoomedMarkerCount = await evalSafe("document.querySelectorAll('.mg-water-marker').length")
        const screenshotZoomed = await sessionSend('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
        })
        writeFileSync(`${OUT}/${theme}-${name}-zoomed.png`, Buffer.from(screenshotZoomed.data, 'base64'))
        console.log(`[${theme}/${name}/zoomed] markers=${zoomedMarkerCount} boundaryPaths=${zoomedBoundaryPathCount}`)
        if (zoomedBoundaryPathCount === 0) {
          problems.push('[decision-map] no boundary paths rendered after zooming in')
        }
      }

      ws.removeEventListener('message', onEvent)
    }
  }

  writeFileSync(`${OUT}/verification-report.json`, JSON.stringify({ problems }, null, 2))
  console.log(problems.length === 0 ? '\nNO CONSOLE PROBLEMS' : `\nPROBLEMS: ${problems.length}`)
} finally {
  chrome.kill()
}
