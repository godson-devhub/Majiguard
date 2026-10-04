import { useEffect, useRef, useState } from 'react'

/**
 * Observes an element's rendered box. Returns 0 before the first measurement so
 * consumers can render a stable first frame instead of guessing a size.
 */
export function useElementSize<TElement extends HTMLElement>() {
  const ref = useRef<TElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (element === null) {
      return
    }

    const measure = () => {
      const rect = element.getBoundingClientRect()
      setSize((current) =>
        Math.abs(current.width - rect.width) < 1 &&
        Math.abs(current.height - rect.height) < 1
          ? current
          : { width: rect.width, height: rect.height },
      )
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => {
        window.removeEventListener('resize', measure)
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  return { ref, ...size }
}