import type { MessageKey } from '@/i18n/messages'
import coatOfArmsSrc from '@/assets/brand/tanzania-coat-of-arms.webp'
import egaLogoSrc from '@/assets/brand/ega-logo.png'
import majiGuardMarkSrc from '@/assets/brand/majiguard-mark.jpg'

export type BrandSlotId = 'tanzania-flag' | 'coat-of-arms' | 'e-ga' | 'majiguard-mark'

/**
 * `approved` is the only state that renders an image. `pending-approval` and
 * `not-available` render a neutral slot frame, so no unapproved or invented
 * government emblem can reach the product by accident.
 */
export type BrandAssetStatus = 'approved' | 'pending-approval' | 'not-available'

export type BrandAsset = {
  id: BrandSlotId
  /** accessible name for the slot, always translated */
  labelKey: MessageKey
  status: BrandAssetStatus
  /** only set when status is `approved` */
  src?: string
  width: number
  height: number
  /** repository files a human may promote once approval is granted */
  candidates: string[]
}

// See src/assets/brand/README.md for exact filenames, specs, and the
// activation steps once each image is actually approved and placed there.
export const brandAssets: Record<BrandSlotId, BrandAsset> = {
  'tanzania-flag': {
    id: 'tanzania-flag',
    labelKey: 'brand.tanzaniaFlag',
    status: 'not-available',
    // Flag aspect ratio, sized to sit comfortably beside the 40px coat-of-arms
    // slot without exceeding its height.
    width: 28,
    height: 20,
    candidates: ['src/assets/brand/tanzania-flag.svg'],
  },
  'coat-of-arms': {
    id: 'coat-of-arms',
    labelKey: 'brand.coatOfArms',
    status: 'approved',
    src: coatOfArmsSrc,
    // 40px keeps a single-line header exactly `--header-height` tall, so the
    // sticky sidebar below it lines up with the header edge.
    width: 40,
    height: 40,
    candidates: ['src/assets/brand/tanzania-coat-of-arms.webp'],
  },
  'e-ga': {
    id: 'e-ga',
    labelKey: 'brand.eGa',
    status: 'approved',
    src: egaLogoSrc,
    width: 132,
    height: 40,
    candidates: ['src/assets/brand/ega-logo.png'],
  },
  'majiguard-mark': {
    id: 'majiguard-mark',
    labelKey: 'brand.majiGuardMark',
    status: 'approved',
    src: majiGuardMarkSrc,
    width: 36,
    height: 36,
    candidates: ['src/assets/brand/majiguard-mark.jpg'],
  },
}
