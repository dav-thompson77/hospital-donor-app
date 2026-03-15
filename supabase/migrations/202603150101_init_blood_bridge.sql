-- Blood Bridge MVP schema
-- Safe to run multiple times where possible.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('donor', 'blood_bank_staff', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'donor_status') then
    create type public.donor_status as enum ('pending_verification', 'approved', 'temporarily_deferred', 'eligible_again');
  end if;
  if not exists (select 1 from pg_type where typname = 'appointment_type') then
    create type public.appointment_type as enum ('blood_typing', 'screening', 'donation');
  end if;
  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
  end if;
  if not exists (select 1 from pg_type where typname = 'urgency_level') then
    create type public.urgency_level as enum ('low', 'medium', 'high', 'critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_response_status') then
    create type public.alert_response_status as enum ('pending', 'interested', 'booked', 'unavailable');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  role public.user_role not null default 'donor',
  full_name text not null default '',
  email text not null unique,
  phone text,
  parish text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donor_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  blood_type text,
  date_of_birth date,
  emergency_contact text,
  status public.donor_status not null default 'pending_verification',
  next_eligible_donation_date date,
  last_donation_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donor_profiles_blood_type_check
    check (
      blood_type is null
      or blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
    )
);

create table if not exists public.blood_centers (
  id bigserial primary key,
  name text not null,
  parish text not null,
  address text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donor_verification_steps (
  donor_profile_id uuid primary key references public.donor_profiles (profile_id) on delete cascade,
  registered boolean not null default true,
  id_verified boolean not null default false,
  medical_screening_completed boolean not null default false,
  haemoglobin_check_completed boolean not null default false,
  medical_interview_completed boolean not null default false,
  approval_outcome public.donor_status not null default 'pending_verification',
  updated_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_requests (
  id bigserial primary key,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  blood_type_needed text not null,
  urgency public.urgency_level not null default 'medium',
  center_id bigint not null references public.blood_centers (id) on delete restrict,
  required_by date not null,
  note text,
  status text not null default 'active' check (status in ('active', 'fulfilled', 'cancelled')),
  ai_message_suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blood_requests_blood_type_check
    check (blood_type_needed in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'))
);

create table if not exists public.appointments (
  id bigserial primary key,
  donor_profile_id uuid not null references public.donor_profiles (profile_id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  blood_request_id bigint references public.blood_requests (id) on delete set null,
  center_id bigint not null references public.blood_centers (id) on delete restrict,
  appointment_type public.appointment_type not null,
  status public.appointment_status not null default 'scheduled',
  scheduled_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donation_history (
  id bigserial primary key,
  donor_profile_id uuid not null references public.donor_profiles (profile_id) on delete cascade,
  center_id bigint not null references public.blood_centers (id) on delete restrict,
  appointment_id bigint unique references public.appointments (id) on delete set null,
  donated_at timestamptz not null,
  blood_type text not null,
  units numeric(4, 1) not null default 1.0,
  notes text,
  created_at timestamptz not null default now(),
  constraint donation_history_blood_type_check
    check (blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'))
);

create table if not exists public.donor_alerts (
  id bigserial primary key,
  blood_request_id bigint not null references public.blood_requests (id) on delete cascade,
  donor_profile_id uuid not null references public.donor_profiles (profile_id) on delete cascade,
  sent_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.donor_alert_responses (
  id bigserial primary key,
  alert_id bigint not null references public.donor_alerts (id) on delete cascade,
  donor_profile_id uuid not null references public.donor_profiles (profile_id) on delete cascade,
  response_status public.alert_response_status not null default 'pending',
  responded_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alert_id, donor_profile_id)
);

create table if not exists public.notifications (
  id bigserial primary key,
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null,
  source_id bigint,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'donor_alerts'
  ) then
    alter publication supabase_realtime add table public.donor_alerts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'donor_alert_responses'
  ) then
    alter publication supabase_realtime add table public.donor_alert_responses;
  end if;
end
$$;

create index if not exists profiles_role_parish_idx on public.profiles (role, parish);
create index if not exists profiles_auth_user_id_idx on public.profiles (auth_user_id);
create index if not exists donor_profiles_status_blood_type_idx on public.donor_profiles (status, blood_type);
create index if not exists donor_profiles_last_donation_idx on public.donor_profiles (last_donation_date);
create index if not exists blood_requests_status_urgency_required_idx on public.blood_requests (status, urgency, required_by);
create index if not exists appointments_donor_scheduled_idx on public.appointments (donor_profile_id, scheduled_at desc);
create index if not exists appointments_centre_scheduled_idx on public.appointments (center_id, scheduled_at desc);
create index if not exists donor_alerts_donor_created_idx on public.donor_alerts (donor_profile_id, created_at desc);
create index if not exists donor_alert_responses_alert_status_idx on public.donor_alert_responses (alert_id, response_status);
create index if not exists notifications_recipient_created_idx on public.notifications (recipient_profile_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists donor_profiles_set_updated_at on public.donor_profiles;
create trigger donor_profiles_set_updated_at
before update on public.donor_profiles
for each row execute function public.set_updated_at();

drop trigger if exists blood_centers_set_updated_at on public.blood_centers;
create trigger blood_centers_set_updated_at
before update on public.blood_centers
for each row execute function public.set_updated_at();

drop trigger if exists donor_verification_steps_set_updated_at on public.donor_verification_steps;
create trigger donor_verification_steps_set_updated_at
before update on public.donor_verification_steps
for each row execute function public.set_updated_at();

drop trigger if exists blood_requests_set_updated_at on public.blood_requests;
create trigger blood_requests_set_updated_at
before update on public.blood_requests
for each row execute function public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

drop trigger if exists donor_alert_responses_set_updated_at on public.donor_alert_responses;
create trigger donor_alert_responses_set_updated_at
before update on public.donor_alert_responses
for each row execute function public.set_updated_at();

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role in ('blood_bank_staff', 'admin')
  );
$$;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_profile_id uuid := gen_random_uuid();
  assigned_role public.user_role := 'donor';
begin
  if new.raw_user_meta_data ? 'role' then
    assigned_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  end if;

  insert into public.profiles (
    id,
    auth_user_id,
    role,
    full_name,
    email
  )
  values (
    new_profile_id,
    new.id,
    assigned_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (auth_user_id) do update
    set email = excluded.email;

  if assigned_role = 'donor' then
    insert into public.donor_profiles (profile_id)
    values (new_profile_id)
    on conflict (profile_id) do nothing;

    insert into public.donor_verification_steps (donor_profile_id, registered)
    values (new_profile_id, true)
    on conflict (donor_profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.donor_profiles enable row level security;
alter table public.blood_centers enable row level security;
alter table public.donor_verification_steps enable row level security;
alter table public.appointments enable row level security;
alter table public.donation_history enable row level security;
alter table public.blood_requests enable row level security;
alter table public.donor_alerts enable row level security;
alter table public.donor_alert_responses enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth_user_id = auth.uid());

drop policy if exists "profiles_staff_read" on public.profiles;
create policy "profiles_staff_read"
on public.profiles
for select
to authenticated
using (public.is_staff_or_admin());

drop policy if exists "profiles_admin_manage" on public.profiles;
create policy "profiles_admin_manage"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "donor_profiles_select_own" on public.donor_profiles;
create policy "donor_profiles_select_own"
on public.donor_profiles
for select
to authenticated
using (profile_id = public.current_profile_id());

drop policy if exists "donor_profiles_update_own" on public.donor_profiles;
create policy "donor_profiles_update_own"
on public.donor_profiles
for update
to authenticated
using (profile_id = public.current_profile_id())
with check (profile_id = public.current_profile_id());

drop policy if exists "donor_profiles_insert_own" on public.donor_profiles;
create policy "donor_profiles_insert_own"
on public.donor_profiles
for insert
to authenticated
with check (profile_id = public.current_profile_id());

drop policy if exists "donor_profiles_staff_read" on public.donor_profiles;
create policy "donor_profiles_staff_read"
on public.donor_profiles
for select
to authenticated
using (public.is_staff_or_admin());

drop policy if exists "donor_profiles_staff_write" on public.donor_profiles;
create policy "donor_profiles_staff_write"
on public.donor_profiles
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists "verification_select_own" on public.donor_verification_steps;
create policy "verification_select_own"
on public.donor_verification_steps
for select
to authenticated
using (donor_profile_id = public.current_profile_id());

drop policy if exists "verification_staff_manage" on public.donor_verification_steps;
create policy "verification_staff_manage"
on public.donor_verification_steps
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists "verification_insert_own" on public.donor_verification_steps;
create policy "verification_insert_own"
on public.donor_verification_steps
for insert
to authenticated
with check (donor_profile_id = public.current_profile_id());

drop policy if exists "centres_public_read" on public.blood_centers;
create policy "centres_public_read"
on public.blood_centers
for select
to anon, authenticated
using (true);

drop policy if exists "centres_staff_manage" on public.blood_centers;
create policy "centres_staff_manage"
on public.blood_centers
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists "appointments_select_own" on public.appointments;
create policy "appointments_select_own"
on public.appointments
for select
to authenticated
using (donor_profile_id = public.current_profile_id());

drop policy if exists "appointments_staff_manage" on public.appointments;
create policy "appointments_staff_manage"
on public.appointments
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own"
on public.appointments
for insert
to authenticated
with check (
  donor_profile_id = public.current_profile_id()
  and created_by_profile_id = public.current_profile_id()
);

drop policy if exists "donation_history_select_own" on public.donation_history;
create policy "donation_history_select_own"
on public.donation_history
for select
to authenticated
using (donor_profile_id = public.current_profile_id());

drop policy if exists "donation_history_staff_manage" on public.donation_history;
create policy "donation_history_staff_manage"
on public.donation_history
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists "blood_requests_read" on public.blood_requests;
create policy "blood_requests_read"
on public.blood_requests
for select
to authenticated
using (status = 'active' or public.is_staff_or_admin());

drop policy if exists "blood_requests_staff_manage" on public.blood_requests;
create policy "blood_requests_staff_manage"
on public.blood_requests
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists "alerts_select_own" on public.donor_alerts;
create policy "alerts_select_own"
on public.donor_alerts
for select
to authenticated
using (donor_profile_id = public.current_profile_id());

drop policy if exists "alerts_staff_manage" on public.donor_alerts;
create policy "alerts_staff_manage"
on public.donor_alerts
for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists "responses_select_own" on public.donor_alert_responses;
create policy "responses_select_own"
on public.donor_alert_responses
for select
to authenticated
using (donor_profile_id = public.current_profile_id());

drop policy if exists "responses_insert_own" on public.donor_alert_responses;
create policy "responses_insert_own"
on public.donor_alert_responses
for insert
to authenticated
with check (donor_profile_id = public.current_profile_id());

drop policy if exists "responses_update_own" on public.donor_alert_responses;
create policy "responses_update_own"
on public.donor_alert_responses
for update
to authenticated
using (donor_profile_id = public.current_profile_id())
with check (donor_profile_id = public.current_profile_id());

drop policy if exists "responses_staff_read" on public.donor_alert_responses;
create policy "responses_staff_read"
on public.donor_alert_responses
for select
to authenticated
using (public.is_staff_or_admin());

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (recipient_profile_id = public.current_profile_id());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (recipient_profile_id = public.current_profile_id())
with check (recipient_profile_id = public.current_profile_id());

drop policy if exists "notifications_staff_insert" on public.notifications;
create policy "notifications_staff_insert"
on public.notifications
for insert
to authenticated
with check (public.is_staff_or_admin());
