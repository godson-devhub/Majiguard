# Brand assets — approval-gated

This directory is the single approved location for the official identity
images the header reserves space for. Per the project's own rule, an
unapproved slot renders a neutral frame, never an invented image — nothing
here was downloaded or substituted; each file below was supplied directly by
the project owner (originally staged in the repository's `gov/` folder) and
explicitly approved for use.

## Files present, slot and specs

| File | Slot | Format | Status | Notes |
|---|---|---|---|---|
| `tanzania-coat-of-arms.webp` | Coat of Arms of the United Republic of Tanzania | WebP | approved | 155×160 source; rendered at 40×40px in the header |
| `ega-logo.png` | e-Government Authority identity | PNG | approved | 621×330 source; rendered at up to 132×40px, right side of the header |
| `majiguard-mark.jpg` | MajiGuard product mark | JPEG | approved | 612×612 source; rendered at 36×36px beside the product name |

The Tanzania flag slot (`tanzania-flag`) remains `not-available` — no flag
asset has been supplied — and the header deliberately never renders it
beside the Coat of Arms regardless (see `institutional-header.tsx`).

## How to activate a file once it is approved

1. Place the approved file in this directory under the exact name above.
2. In `src/components/brand/brand-assets.ts`, set that slot's `status` to
   `'approved'` and its `src` to the imported asset path.
3. That is the only code change required — `IdentitySlot` already renders
   the image automatically once `status === 'approved'` and `src` is set,
   and renders nothing (a neutral frame) until then.

## Why this matters

- The Tanzania Coat of Arms and flag are protected national emblems; using
  an unverified copy, even temporarily, is not acceptable for a product that
  must never be mistaken for an official government system.
- The e-GA mark is a third party's brand asset and needs their own sign-off
  before it can render.
- `brand-assets.ts`'s `BrandAssetStatus` type (`'approved' | 'pending-approval'
  | 'not-available'`) exists specifically so no unapproved image can reach
  the product by accident, regardless of what files happen to sit in a
  directory. Adding a file here does nothing on its own - the status flag in
  code is what actually gates rendering.
