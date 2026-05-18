# Today's Stash Lite

A local deals discovery platform built for businesses and consumers in regional Australia. Merchants publish time-limited discount offers; consumers browse, reserve, and redeem them via QR code at the venue.

## Tech Stack

- **Framework** — Next.js 14 (App Router)
- **Database & Auth** — Supabase (PostgreSQL, Row-Level Security, Storage)
- **Styling** — Tailwind CSS
- **Notifications** — Twilio (SMS) & Resend (Email)
- **Deal Generation** — OpenAI GPT-4o

## Project Structure

```
app/
  (auth)/          # Sign-in, sign-up, password reset flows
  admin/           # Internal admin panel (application review, towns)
  consumer/        # Deal browsing, reservation, and redemption
  merchant-dashboard/ # Merchant portal (deals, settings, QR poster)
  api/             # Route handlers (auth, notifications, webhooks)
  actions/         # Server actions (deal generation)
components/        # Shared UI components
lib/               # Supabase clients, type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the required schema applied
- Environment variables configured (see below)

### Environment Variables

Create a `.env.local` file at the root with the following keys:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
RESEND_API_KEY=
NEXT_PUBLIC_OFFER_BUCKET=offer-media
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Features

- **Merchant portal** — Create and manage discount deals with flexible scheduling (one-off or recurring weekly)
- **AI deal assistant** — Describe a promotion in plain text to generate suggested deal copy
- **Consumer discovery** — Browse deals by town, filter by category, reserve slots in real time
- **QR code redemption** — Staff scan a customer's unique QR code to validate and apply the deal
- **Notification system** — Email and SMS alerts when new deals go live in subscribed towns
- **Strike system** — Automated no-show tracking with a 7-day rolling window
- **Admin panel** — Review and approve merchant applications, manage active towns

## Deployment

The project is deployed on [Vercel](https://vercel.com). Push to `main` to trigger a production deployment. Ensure all environment variables are configured in the Vercel project settings.
