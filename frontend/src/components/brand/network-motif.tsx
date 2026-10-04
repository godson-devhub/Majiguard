export type NetworkMotifProps = {
  className?: string
}

/**
 * Restrained connected-node motif for institutional surfaces. Decorative only:
 * hidden from assistive technology and never interactive.
 */
export function NetworkMotif({ className }: NetworkMotifProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="mg-network-motif" width="96" height="96" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M0 96 L48 48 L96 96" />
            <path d="M0 0 L48 48 L96 0" />
            <path d="M48 0 L48 96" />
            <path d="M0 48 L96 48" />
          </g>
          <g fill="currentColor">
            <circle cx="48" cy="48" r="2" />
            <circle cx="0" cy="0" r="1.5" />
            <circle cx="96" cy="0" r="1.5" />
            <circle cx="0" cy="96" r="1.5" />
            <circle cx="96" cy="96" r="1.5" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#mg-network-motif)" />
    </svg>
  )
}
