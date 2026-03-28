# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VFetch Customer Web — a lost & found platform where hotel/venue guests search for lost items, review AI-matched results, and arrange collection via self-pickup or courier (Stripe payments, Parcel2Go/Uber integration).

## Commands

```bash
npm run dev          # Dev server on port 3002
npm run build        # Production build
npm start            # Production server on port 3002
npm run lint         # ESLint (Next.js config)
npm run type-check   # TypeScript type checking
```

No test framework is configured.

## Architecture

**Framework**: Next.js 14 App Router, React 18, TypeScript (strict mode), Tailwind CSS.

**Path alias**: `@/*` maps to `./src/*`.

**All components use `'use client'`** — this is a fully client-rendered app despite using App Router.

### Routes

- `/` — Landing page
- `/demo` — Venue selector
- `/venue/[venueId]/lost-and-found` — Main platform (venue-specific branding)

### Source Layout

- `src/app/` — Next.js App Router pages and layouts
- `src/components/` — React components implementing the 5-step workflow
- `src/lib/api.ts` — Centralized Axios API client (`customerApi`) with all backend endpoints
- `src/types/index.ts` — Shared TypeScript interfaces

### 5-Step Workflow

1. **SearchItems** — Item description form with validation (3-word/15-char hard min; 8-word/40-char soft nudge), real-time UX nudges (color, brand, size, location), AI matching at 85%+ threshold
2. **Matches** — Review AI-matched items with photo carousel, click to claim
3. **ClaimStatus** — Check claim status by Claim ID, session storage persistence
4. **CollectionMethods** — Self-pickup or courier (Parcel2Go/Uber)
5. **Payment** — Stripe integration via `@stripe/react-stripe-js` with courier fee breakdown

### Key Integrations

- **Backend**: AWS ALB, API routes proxied via `next.config.js` rewrites
- **Stripe**: Payment processing for collection fees
- **Google Places API**: Address autocomplete in `CourierAddressForm`
- **crypto-js**: SHA256 email hashing for privacy

### Environment Variables

- `NEXT_PUBLIC_API_BASE_URL` — Frontend API base
- `BACKEND_URL` — Backend URL for Next.js rewrites
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps/Places API key

### Styling

Tailwind CSS with custom color tokens (`primary`, `accent`, `sidebar`, `vfetch`) and DM Sans font. Mobile-first responsive design.
