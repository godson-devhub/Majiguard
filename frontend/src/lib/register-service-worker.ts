/**
 * Registers `public/sw.js` in production builds only: during development the
 * Vite dev server must always answer, so nothing is cached there.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Caching is an optimisation; the app works without it.
    })
  })
}
