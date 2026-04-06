# VFetch Customer Web Platform

Customer-facing web application for the VFetch lost and found platform. This allows customers to search for lost items, submit claims, and track their collection status.

## Features

### Complete Lost & Found Workflow
- **Step 1**: Search for lost items with AI-powered matching (85%+ threshold)
- **Step 2**: Claim items and receive Claim ID via email
- **Step 3**: Check claim status using Claim ID
- **Step 4**: Choose collection method (self pickup, Parcel2Go, Uber courier)
- **Step 5**: Track delivery for courier options

### Venue Customization
- Venue-specific URLs: `/venue/[venueId]/lost-and-found`
- Custom branding with venue colors and logo
- Venue-specific collection hours and contact information

## Getting Started

### Prerequisites
- Node.js 18+
- Backend API running on port 3000

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

Visit `http://localhost:3001` to see the platform.

### Production Build
```bash
npm run build
npm start
```

If you are using **proxy mode**, make sure `BACKEND_URL` is set before running `npm run build` or `npm start`.

## URL Structure

- `/` - Landing page with demo links
- `/demo` - Demo page to try different venue examples
- `/venue/[venueId]/lost-and-found` - Main platform for each venue

## Environment Variables

You can run the app in one of two API modes.

### Option 1: Proxy mode

Use this when the frontend should call `/api` and Next.js should proxy those requests to your backend.

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_URL=http://localhost:3000
```

### Option 2: Direct mode

Use this when the frontend should call the backend API directly.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

## Demo Usage

1. Visit `/demo` page
2. Select a demo venue (Grand Plaza Hotel, TechCon Conference Center, etc.)
3. Try the complete workflow:
   - Search for items by description
   - Submit a claim for found items
   - Check claim status with generated Claim ID
   - Choose collection method

## Technical Details

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **HTTP Client**: Axios
- **Cryptography**: crypto-js (for SHA email hashing)

### Key Components
- `SearchItems` - Implements Step 1 (search and claim workflow)
- `ClaimStatus` - Implements Step 3 (status checking)
- `CollectionMethods` - Implements Step 4 (collection options)

### API Integration
All API calls go through `/src/lib/api.ts` which handles:
- Query registration with SHA email hashing
- AI-powered item matching
- Claim status checking
- Courier quote retrieval
- Address validation
- Delivery tracking

## Deployment

The app can be deployed to any platform that supports Next.js:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Docker containers

Make sure your API environment variables match the mode you are using:

- **Proxy mode:** `NEXT_PUBLIC_API_BASE_URL=/api` and `BACKEND_URL` points to the backend origin
- **Direct mode:** `NEXT_PUBLIC_API_BASE_URL` points directly to the backend `/api` base URL
