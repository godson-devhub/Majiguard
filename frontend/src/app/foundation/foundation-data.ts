export const spacingScale = [1, 2, 3, 4, 6, 8, 12, 16] as const

export const radiusScale = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const

export const elevationScale = [0, 1, 2, 3] as const

export type TokenRow = {
  token: string
  label: string
  usage: string
}

export const mapFoundationTokens: TokenRow[] = [
  { token: '--map-surface', label: 'Map panel surface', usage: 'Container behind the map canvas' },
  { token: '--map-overlay', label: 'Map overlay', usage: 'Floating panels and legends over the map' },
  { token: '--map-overlay-border', label: 'Overlay boundary', usage: 'Separates overlays from map content' },
  { token: '--map-marker-stroke', label: 'Marker outline', usage: 'Keeps markers separable from any basemap' },
  { token: '--map-attribution-foreground', label: 'Attribution text', usage: 'Basemap attribution must stay readable' },
]
