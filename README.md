# Blood Bridge MVP

Blood Bridge is a real-time donor coordination platform built to help blood bank teams find, verify, schedule, and re-engage eligible donors while guiding donors through official screening and donation workflows.

## Tech stack used

- **Next.js** (frontend + server actions)
- **Supabase** (Postgres, Auth, Realtime, RLS)
- **Vercel** (deployment)

## Problem, Impact & Solution

### Problem
Blood banks and blood services need to quickly identify and reach eligible donors during urgent blood needs, but coordination is often manual and slow.

### Impact
Delays in donor coordination can affect response times for urgent care, increase staff workload, and reduce efficiency of blood collection operations.

### Solution
Blood Bridge provides one coordinated workflow for donor onboarding, staff request management, realtime alerts/responses, and appointment scheduling.

> Clinical rule: this app supports the donation process and does **not** replace clinical screening or medical decision-making.

---

## Implemented MVP scope

### Roles

- `donor`
- `blood_bank_staff`
- `admin`

### Donor experience

- Secure sign up/login with Supabase Auth
- Donor dashboard
- Donor profile management:
  - full name
  - email
  - phone
  - parish/location
  - blood type
  - date of birth
  - emergency contact
- Eligibility tracker (registered, ID verification, screening, haemoglobin, interview, approval/deferred)
- Appointment booking:
  - blood typing
  - screening
  - donation
- Appointment history
- Donation history
- Next eligible donation date display
- Real-time alert inbox
- Alert response actions:
  - interested
  - booked
  - unavailable
- Donation centre finder page

### Staff experience

- Staff dashboard with analytics cards:
  - active requests
  - total approved donors
  - pending verification
  - booked appointments
  - responses received
- Blood request creation
- Donor directory with filters:
  - blood type
  - approval status
  - location
  - last donation date
  - response history
- Donor workflow status management (verification + approval outcome)
- Appointment creation and status updates
- Alert sending (single donor or broadcast by blood-type match)
- Real-time response tracking

### AI-assisted outreach (demo-safe)

- OpenRouter-backed server route (`POST /api/ai/outreach`) generates outreach variants using server-side secrets.
- If OpenRouter is unavailable, the app automatically falls back to rule-based templates.
- On blood request creation, matching donors now receive:
  - automatic in-app alerts (`donor_alerts`)
  - automatic SMS dispatch to donor phone numbers (Twilio server-side integration)
- Suggestions are generated from:
  - blood type
  - urgency
  - donor approval status
  - last donation date
- Produces three labeled templates per request:
  - `URGENT OUTREACH`
  - `REMINDER MESSAGE`
  - `FOLLOW-UP CONFIRMATION`
- Staff can copy generated messages directly from the requests page and open alerts flow.
- Stored with blood requests in `ai_message_suggestions` (`jsonb`)
- Architecture allows replacing with external LLM provider later

### Realtime

Supabase Realtime subscriptions refresh key pages when:

- donor alerts/responses change
- donor appointment records change
- staff receives new response activity

---

## App routes

- `/` landing page
- `/auth/login`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/update-password`
- `/dashboard` role-aware redirect

### Donor

- `/donor`
- `/donor/profile`
- `/donor/appointments`
- `/donor/alerts`
- `/donor/donations`

### Staff/Admin

- `/staff`
- `/staff/donors`
- `/staff/requests`
- `/staff/appointments`
- `/staff/alerts`

### Shared

- `/centres`

---

## Database schema and seed

### Migration files

- `supabase/migrations/202603150101_init_blood_bridge.sql`

Includes:

- enums:
  - `user_role`
  - `donor_status`
  - `appointment_type`
  - `appointment_status`
  - `urgency_level`
  - `alert_response_status`
- tables:
  - `profiles`
  - `donor_profiles`
  - `blood_centers`
  - `donor_verification_steps`
  - `appointments`
  - `donation_history`
  - `blood_requests`
  - `donor_alerts`
  - `donor_alert_responses`
  - `notifications`
- indexes and `updated_at` triggers
- new-user trigger from `auth.users` to create profile + donor rows
- row level security policies for donor/staff/admin access controls

### Seed file

- `supabase/seed.sql`

Seeds:

- 6 donor profiles with varied blood types/statuses
- 2 staff profiles (+ admin profile)
- 3 centres
- 3 blood requests
- sample appointments, alerts, responses, notifications

---

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create local env:

```bash
cp .env.example .env.local
```

3. Add your Supabase values (already prefilled in `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://znmzisdzzkifinjlylco.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_DAj5lxE9Td4QQBS6As_h_w_5riUAxc7
NEXT_PUBLIC_SITE_URL=https://hospital-donor-app.vercel.app
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+17712521684
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_STATUS_CALLBACK_URL=https://hospital-donor-app.vercel.app/api/twilio/sms/status
```

4. Apply SQL:

- Hosted project: run migration SQL and seed SQL in Supabase SQL Editor.
- With Supabase CLI/local DB:

```bash
supabase db push
supabase db reset --seed
```

5. Run app:

```bash
npm run dev
```

---

## Role assignment for real auth users

New sign-ups default to `donor`. To grant staff/admin access, update the user profile role:

```sql
update public.profiles
set role = 'blood_bank_staff'
where email = 'staff-user@example.com';
```

or

```sql
update public.profiles
set role = 'admin'
where email = 'admin-user@example.com';
```

---

## Deploy to Vercel

1. Import this GitHub repo in Vercel.
2. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your Vercel production URL)
   - `OPENROUTER_API_KEY` (server-side secret)
   - `OPENROUTER_BASE_URL` (optional, defaults to OpenRouter API)
   - `OPENROUTER_MODEL` (optional, defaults to `openai/gpt-4o-mini`)
   - `TWILIO_ACCOUNT_SID` (server-side secret)
   - `TWILIO_AUTH_TOKEN` (server-side secret)
   - `TWILIO_FROM_NUMBER` (Twilio sender number) OR `TWILIO_MESSAGING_SERVICE_SID`
   - `TWILIO_STATUS_CALLBACK_URL` (optional delivery status callback URL)
3. Deploy.
4. Ensure the Supabase migration + seed SQL has been run in the connected Supabase project.
5. In Supabase Auth settings, confirm Site URL + Redirect URLs include:
   - `https://hospital-donor-app.vercel.app/auth/callback`
   - `https://hospital-donor-app.vercel.app/dashboard`
6. Add OpenRouter and Twilio secrets to local env, Vercel env, and any CI secret store used for deployments.
7. In Twilio Phone Number config (Messaging):
   - **Webhook URL**: `https://hospital-donor-app.vercel.app/api/twilio/sms/reply`
   - **Method**: `POST`
8. Ensure `TWILIO_FROM_NUMBER` uses strict E.164 format (no spaces), e.g. `+17712521684`.

---

## Notes

- `npm run build` passes.
- If you run `npm run lint`, include source-only paths (example):

```bash
npx eslint app components lib proxy.ts
```

because generated `.next` files are not meant to be linted directly.
