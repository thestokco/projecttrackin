@AGENTS.md

# Project Tracker

A Next.js 16 + Supabase web app for teams to submit and track project records (submissions, cable returns, photos). Built as a PWA with mobile-first design.

## Tech Stack

- **Framework**: Next.js 16.2.6 (App Router) with React 19, TypeScript 5
- **Styling**: Tailwind CSS 4 (PostCSS plugin, `@theme inline` in globals.css, no tailwind.config)
- **Backend**: Supabase (Auth, Postgres, Storage, Realtime)
- **Icons**: lucide-react
- **Dates**: date-fns
- **Export**: xlsx (SheetJS) for Excel export
- **Fonts**: Geist Sans + Geist Mono via `next/font/google`

## Commands

```
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint (flat config, eslint.config.mjs)
```

No test framework is configured.

## Project Structure

```
src/
  app/
    layout.tsx              # Root layout (metadata, fonts, FontSizeInit)
    page.tsx                # Redirects / -> /form
    globals.css             # Tailwind + custom CSS vars, animations, utility classes
    login/page.tsx          # Login page (email/password via Supabase Auth)
    signup/page.tsx         # Signup page (invite code + profile fields)
    api/admin/delete-member/route.ts   # API route: admin deletes a member (uses service role key)
    (protected)/
      layout.tsx            # Client layout shell: UserProvider, nav bar, bottom tabs, mobile menu
      form/page.tsx         # New submission form
      my-submissions/
        page.tsx            # User's own submissions table
        [id]/page.tsx       # Submission detail view
        [id]/edit/page.tsx  # Edit own submission
      all-data/
        page.tsx            # All submissions table (search, sort, filter, paginate, export)
        [id]/page.tsx       # Submission detail view (read-only)
      dashboard/page.tsx    # Stats + charts: submissions count, members, pending cable returns
      settings/page.tsx     # Profile edit, password change, invite codes, team members, font size
  lib/
    supabase/
      client.ts             # Browser Supabase client (createBrowserClient)
      server.ts             # Server Supabase client (createServerClient with cookies)
      middleware.ts          # Auth middleware (updateSession): redirects unauthenticated to /login
    types.ts                # TypeScript interfaces: Profile, Submission, TeamSettings, UserRole
    user-context.tsx        # React context: UserProvider + useUser() hook (profile, isAdmin)
    mock-store.ts           # In-memory demo mode store (NEXT_PUBLIC_DEMO_MODE=true)
    date.ts                 # parseDate() helper: parses YYYY-MM-DD as local time
    font-size.ts            # Font size preference (localStorage + body zoom)
  proxy.ts                  # Next.js 16 middleware entry point (exported as `proxy` not `middleware`)
  components/
    InstallPrompt.tsx       # PWA "Add to Home Screen" prompt
    PullToRefresh.tsx       # Mobile pull-to-refresh wrapper
    FontSizeInit.tsx        # Applies saved font size on mount
```

## Key Architecture Decisions

### Middleware (Next.js 16 breaking change)
The middleware is in `src/proxy.ts` and exports `proxy` (not `middleware`). This is a Next.js 16 convention — do NOT rename it. The `config.matcher` is also exported from this file.

### All pages under `(protected)/` are client components
The `(protected)/layout.tsx` is `"use client"` and wraps children in `<UserProvider>`. All page files use `"use client"` and call Supabase directly from the browser.

### Demo mode
Set `NEXT_PUBLIC_DEMO_MODE=true` to run without Supabase. Uses `mockStore` (in-memory) for all data operations. The proxy skips auth checks in demo mode.

### Auth flow
- Signup requires an invite code validated via `validate_invite_code()` RPC (public, no auth needed)
- The invite code determines the role (admin vs member) — the DB trigger `handle_new_user()` derives the role server-side, ignoring any client-supplied role
- Member removal uses an API route (`/api/admin/delete-member`) that needs `SUPABASE_SERVICE_ROLE_KEY` env var

### Realtime
The `submissions` table is published to Supabase Realtime. Dashboard, All Data, and My Submissions pages subscribe to `postgres_changes` and auto-refresh on any change.

### Photo uploads
- Stored in Supabase Storage bucket `submission-photos` (public-read)
- Files go to `{userId}/{timestamp}-{random}.{ext}` paths
- Max 5 photos per submission, max 15MB per file, image/* only
- RLS enforces users can only upload to their own folder

## Database

Schema is in `supabase-schema.sql`. Three tables:
- **profiles** — user profiles (name, email, contact_no, role: admin|member)
- **submissions** — project submissions (dates, application_number, cable_return, photos[], location, remark)
- **team_settings** — invitation codes (admin_code, member_code)

RLS is enabled on all tables. Key policies:
- All authenticated users can view profiles and submissions
- Users can only insert/update their own data
- Only admins can delete submissions and manage team settings
- Members can read member_code via RPC only (not direct table access)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=        # Service role key (server-side only, for admin member deletion)
NEXT_PUBLIC_DEMO_MODE=            # Set to "true" to enable demo mode (no Supabase needed)
```

## Styling Conventions

- **Color system**: CSS custom properties in `:root` (globals.css), mapped to Tailwind via `@theme inline`
- **Theme**: Warm brown/stone palette (primary: #6b5b50)
- **Utility classes**: `gradient-bg`, `gradient-text`, `glass`, `glass-dark`, `card-hover`, `pattern-dots`, `stat-card`, `animate-slide-up`, `animate-fade-in`
- **Component sizing**: Text uses explicit pixel sizes like `text-[13px]`, `text-[11px]` — not Tailwind's default scale
- **Cards**: `bg-card rounded-2xl border border-border/40 shadow-sm` pattern
- **Buttons**: `gradient-bg text-white shadow-md shadow-primary/20 rounded-xl text-[13px] font-semibold`
- **Font size**: User-adjustable via Settings (small/medium/large/xlarge), implemented via `body.zoom` + CSS var `--font-scale`

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## PWA

- `public/manifest.json` — web app manifest (standalone display, portrait orientation)
- `public/sw.js` — minimal pass-through service worker (no caching, just enables PWA installability)
- `public/icons/` — icon-192.png and icon-512.png
- InstallPrompt component shows "Add to Home Screen" instructions on first visit

## Icon Generation

Two icon generation scripts exist (neither is an npm script — run manually):
- `generate-icons.mjs` — uses `sharp` to convert `public/icon.svg` into all PNG icons (192, 512, 32 favicon, 180 apple-touch-icon). Preferred method.
- `scripts/generate-icons.js` — fallback using `canvas` package (CommonJS), generates 192 and 512 only.

## Gotchas

- **No `src/middleware.ts`** — Next.js 16 uses `src/proxy.ts` with an exported `proxy` function instead. Do not create a `middleware.ts`.
- **`.env.local.example`** exists but only has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_DEMO_MODE` vars are not in the example file.
- **`parseDate()` is required for date display** — always use `parseDate()` from `@/lib/date` when parsing date strings from the database. It handles `YYYY-MM-DD` as local time to avoid UTC timezone shift.
- **All protected pages are client-side rendered** — they use `"use client"` and fetch data via the browser Supabase client. There are no server components inside `(protected)/`.
- **Supabase client is created per-call** — `createClient()` is called inside each function/effect, not stored globally. Follow this pattern.
- **Tailwind CSS 4** — uses `@import "tailwindcss"` and `@theme inline` blocks, NOT the old `@tailwind` directives or `tailwind.config.js`. PostCSS plugin is `@tailwindcss/postcss`, not `tailwindcss`.
