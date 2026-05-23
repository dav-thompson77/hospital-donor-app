# BloodBridge 🩸
### Real-Time Donor Coordination Platform

BloodBridge helps blood banks find, alert, and coordinate with eligible donors in real time — replacing slow, manual outreach with an automated end-to-end workflow.

---

## The Problem

Blood banks need to quickly identify and reach eligible donors during urgent blood needs, but coordination is often manual and slow. Delays affect response times for urgent care, increase staff workload, and reduce the efficiency of blood collection operations.

---

## Solution

One coordinated platform for donor onboarding, staff request management, real-time alerts, and appointment scheduling — with AI-assisted outreach and automated SMS via Twilio.

---

## Features

**For Donors**
- Register and manage a full donor profile
- Track eligibility status through each verification step
- Receive real-time alerts and respond directly in-app
- Book appointments and view donation history

**For Blood Bank Staff**
- Create blood requests and identify matching donors automatically
- Send targeted alerts (individual or broadcast by blood type)
- Track donor responses in real time via a live dashboard
- Manage appointments and donor verification workflows

**AI-Assisted Outreach**
- Generates personalised SMS outreach messages using LLM APIs
- Produces Urgent, Reminder, and Follow-Up message variants per request
- Falls back to rule-based templates if AI is unavailable
- Automated SMS dispatch via Twilio on blood request creation

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Supabase (Postgres, Auth, Realtime, RLS) |
| AI | OpenRouter API (LLM-powered outreach generation) |
| SMS | Twilio |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js & npm
- Supabase account
- OpenRouter API key
- Twilio account

### Installation

```bash
# Clone the repository
git clone 
cd bloodbridge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase, OpenRouter, and Twilio credentials

# Run the development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_SITE_URL=your_site_url
OPENROUTER_API_KEY=your_openrouter_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_number
```

### Database Setup

Run the migration and seed files in your Supabase SQL Editor:
supabase/migrations/202603150101_init_blood_bridge.sql
supabase/seed.sql

---

## Clinical Note

BloodBridge supports the donation coordination process and does not replace clinical screening or medical decision-making. Final eligibility authority remains with clinical teams.

---

