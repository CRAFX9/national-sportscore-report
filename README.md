# NSRC — National Sports Report Card (Web MVP)

Offline-first sports talent assessment platform for India. Built for Smart India Hackathon as a
responsive web app (installable PWA-ready) so it previews live in Lovable.

> Note: A native React Native + Expo build is not runnable in the Lovable sandbox. This project
> ships the same feature set as a mobile-first web app with an IndexedDB local database (Dexie),
> which is the web equivalent of SQLite for offline storage.

## Stack

- TanStack Start (React 19 + Vite) with file-based routing
- Tailwind CSS v4 with Material Design 3-inspired tokens (India Blue / White / Saffron)
- Zustand (auth, theme, assessment draft) with persisted stores
- TanStack Query for data fetching + cache
- Dexie (IndexedDB) — offline-first local DB, repository pattern
- React Hook Form + Zod validation
- Recharts (radar + timeline) and qrcode.react
- shadcn/ui + lucide-react, sonner toasts

## Features (Phase 1)

- Animated splash + auto-login + offline check
- Role selection (Coach / District Officer / SAI / Parent) + OTP UI (demo `123456`)
- Coach dashboard: today's assessments, students, pending sync, top athletes, recent reports, FAB
- Student registration with photo, validation, QR code, saved offline
- Student list with search, filters, edit, delete
- Assessment picker (6 tests, multi-select), instructions with language selector
- Camera capture with skeleton overlay, quality chips, live timer
- AI processing screen with staged progress
- Results: overall score ring, radar chart, per-metric cards, percentile, rank, recommendations
- Digital scout profile with QR, timeline, history, remarks, PDF placeholder, share
- Sync queue with retry, per-item progress, connectivity indicator
- Light/dark mode toggle

## Architecture

```
src/
  components/
    nsrc/            # domain components (TopBar, BottomNav, StatusChip, ScoreRing, MetricsRadar, states)
    ui/              # shadcn primitives
  lib/
    db.ts            # Dexie schema (users, students, assessments, assessment_results, reports, sync_queue, notifications)
    repositories.ts  # repository pattern per table
    seed.ts          # realistic Indian dummy data
    types.ts
  stores/
    auth.ts          # persisted role/session
    theme.ts         # persisted light/dark
    assessment-draft.ts
  routes/
    index.tsx                       # splash
    login.tsx
    _app.tsx                        # authed layout: TopBar + Outlet + BottomNav
    _app.dashboard.tsx
    _app.students.index.tsx
    _app.students.new.tsx
    _app.students.$id.edit.tsx
    _app.assessments.new.tsx
    _app.assessments.instructions.tsx
    _app.assessments.capture.tsx
    _app.assessments.processing.tsx
    _app.assessments.results.$id.tsx
    _app.profile.$id.tsx
    _app.sync.tsx
    _app.me.tsx
```

## Setup

```
bun install
bun run dev
```

Demo OTP: `123456`. Dummy data seeds automatically on first load.

## Phase 2 (not built)

AI pose analysis, backend APIs, government integration, analytics dashboards.
