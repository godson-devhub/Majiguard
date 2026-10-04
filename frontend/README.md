# MajiGuard AI — frontend

React + TypeScript + Vite foundation for the MajiGuard AI internal dashboard.

## Status

Step 9.1 (architecture and project setup) only. The dashboard, map, analytics,
water point detail views, design system, and routing arrive in later steps.

## Stack

| Concern | Choice |
| --- | --- |
| UI runtime | React 19 + TypeScript (strict) |
| Build | Vite |
| Package manager | npm |
| Server state | TanStack Query |
| Map | Leaflet + React Leaflet |
| Components | shadcn/ui (Base UI, `nova` preset, neutral base color) |

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

## Configuration

Copy `.env.example` to `.env.local` and adjust if the backend runs somewhere
other than `http://127.0.0.1:8000`. Only browser-safe values belong in `VITE_*`
variables; never put backend credentials or secrets in this project.

The frontend calls the backend through the `/api` base path. In development,
Vite proxies `/api` to `DEV_API_TARGET`, which keeps requests same-origin because
the FastAPI backend does not enable CORS.

## Architecture

```
src/
├── app/                 # application composition root and providers
│   ├── App.tsx
│   └── providers/
├── components/          # shared components (shadcn/ui lands in components/ui)
├── lib/                 # infrastructure: env, api client, query client, utils
├── services/            # typed backend endpoints and query hooks
└── types/               # TypeScript mirrors of the backend response schemas
```

Rules that govern this code are in `../AGENTS.md` and
`../.kilo/skills/majiguard-frontend/SKILL.md`. The backend is the only source of
product data; nothing is recomputed in the browser and no placeholder data is
permitted.
