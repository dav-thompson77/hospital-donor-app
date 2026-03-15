-- Blood Bridge demo seed (Jamaica-focused)
-- Note: these are demo profile records; auth_user_id is null for seeded users.

insert into public.profiles (id, role, full_name, email, phone, parish, auth_user_id)
values
  ('00000000-0000-0000-0000-000000000101', 'blood_bank_staff', 'Dr. Althea McKenzie', 'althea.mckenzie@bloodbridge.demo', '+1-876-555-0101', 'Kingston', null),
  ('00000000-0000-0000-0000-000000000102', 'blood_bank_staff', 'Marlon Gayle', 'marlon.gayle@bloodbridge.demo', '+1-876-555-0102', 'St. Ann', null),
  ('00000000-0000-0000-0000-000000000103', 'admin', 'Nadine Blake', 'nadine.blake@bloodbridge.demo', '+1-876-555-0103', 'Kingston', null),
  ('00000000-0000-0000-0000-000000000201', 'donor', 'Raneil Thompson', 'raneil.thompson@bloodbridge.demo', '+1-876-555-0201', 'Kingston', null),
  ('00000000-0000-0000-0000-000000000202', 'donor', 'Shanoya Campbell', 'shanoya.campbell@bloodbridge.demo', '+1-876-555-0202', 'St. Ann', null),
  ('00000000-0000-0000-0000-000000000203', 'donor', 'Andre Wallace', 'andre.wallace@bloodbridge.demo', '+1-876-555-0203', 'Westmoreland', null),
  ('00000000-0000-0000-0000-000000000204', 'donor', 'Kadian Grant', 'kadian.grant@bloodbridge.demo', '+1-876-555-0204', 'Portland', null),
  ('00000000-0000-0000-0000-000000000205', 'donor', 'Jamar Powell', 'jamar.powell@bloodbridge.demo', '+1-876-555-0205', 'St. Catherine', null),
  ('00000000-0000-0000-0000-000000000206', 'donor', 'Tashika Brown', 'tashika.brown@bloodbridge.demo', '+1-876-555-0206', 'Clarendon', null)
on conflict (id) do update
set
  role = excluded.role,
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  parish = excluded.parish;

insert into public.donor_profiles (
  profile_id,
  blood_type,
  date_of_birth,
  emergency_contact,
  status,
  next_eligible_donation_date,
  last_donation_date,
  notes
)
values
  ('00000000-0000-0000-0000-000000000201', 'O-', '1991-08-16', 'Kimone Thompson (+1-876-555-1101)', 'approved', current_date + 5, current_date - 112, 'Lives near NBTS and responds quickly to urgent calls'),
  ('00000000-0000-0000-0000-000000000202', 'A+', '1994-11-02', 'Paul Campbell (+1-876-555-1102)', 'eligible_again', current_date + 2, current_date - 64, 'Eligible for follow-up donation this week'),
  ('00000000-0000-0000-0000-000000000203', 'B+', '1989-05-28', null, 'approved', current_date + 9, current_date - 82, 'Registered through Savanna-la-Mar outreach drive'),
  ('00000000-0000-0000-0000-000000000204', 'AB-', '1998-03-07', 'Leanne Grant (+1-876-555-1104)', 'temporarily_deferred', current_date + 30, current_date - 40, 'Temporary deferral pending repeat haemoglobin check'),
  ('00000000-0000-0000-0000-000000000205', 'O+', '1996-01-22', null, 'pending_verification', null, null, 'New donor awaiting full verification and screening'),
  ('00000000-0000-0000-0000-000000000206', 'A-', '1987-09-14', 'Ricardo Brown (+1-876-555-1106)', 'approved', current_date + 12, current_date - 95, 'Preferred donor for National Chest Hospital drives')
on conflict (profile_id) do update
set
  blood_type = excluded.blood_type,
  date_of_birth = excluded.date_of_birth,
  emergency_contact = excluded.emergency_contact,
  status = excluded.status,
  next_eligible_donation_date = excluded.next_eligible_donation_date,
  last_donation_date = excluded.last_donation_date,
  notes = excluded.notes;

insert into public.donor_verification_steps (
  donor_profile_id,
  registered,
  id_verified,
  medical_screening_completed,
  haemoglobin_check_completed,
  medical_interview_completed,
  approval_outcome,
  updated_by_profile_id
)
values
  ('00000000-0000-0000-0000-000000000201', true, true, true, true, true, 'approved', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000202', true, true, true, true, true, 'eligible_again', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000203', true, true, true, true, true, 'approved', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000204', true, true, true, false, false, 'temporarily_deferred', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000205', true, false, false, false, false, 'pending_verification', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000206', true, true, true, true, true, 'approved', '00000000-0000-0000-0000-000000000102')
on conflict (donor_profile_id) do update
set
  registered = excluded.registered,
  id_verified = excluded.id_verified,
  medical_screening_completed = excluded.medical_screening_completed,
  haemoglobin_check_completed = excluded.haemoglobin_check_completed,
  medical_interview_completed = excluded.medical_interview_completed,
  approval_outcome = excluded.approval_outcome,
  updated_by_profile_id = excluded.updated_by_profile_id;

insert into public.blood_centers (id, name, parish, address, latitude, longitude, phone, is_active)
values
  (1, 'National Blood Transfusion Service', 'Kingston', '21 Slipe Pen Road, Kingston', 18.001450, -76.792400, '+1-876-555-3001', true),
  (2, 'St. Ann''s Bay Hospital', 'St. Ann', '15 St. Ann''s Bay Main Road, St. Ann''s Bay', 18.434200, -77.202300, '+1-876-555-3002', true),
  (3, 'Savanna-la-Mar Hospital', 'Westmoreland', '6 Beckford Street, Savanna-la-Mar', 18.218000, -78.133000, '+1-876-555-3003', true),
  (4, 'Port Antonio Hospital', 'Portland', 'West Street, Port Antonio', 18.174400, -76.450500, '+1-876-555-3004', true),
  (5, 'National Chest Hospital / Kiwanis Blood Collection Centre', 'Kingston', '36 Barbican Road, Kingston 6', 18.021900, -76.763500, '+1-876-555-3005', true)
on conflict (id) do update
set
  name = excluded.name,
  parish = excluded.parish,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  phone = excluded.phone,
  is_active = excluded.is_active;

insert into public.blood_requests (
  id,
  created_by_profile_id,
  blood_type_needed,
  urgency,
  center_id,
  required_by,
  note,
  status,
  ai_message_suggestions
)
values
  (
    1,
    '00000000-0000-0000-0000-000000000101',
    'O-',
    'critical',
    1,
    current_date + 1,
    'Emergency trauma and ICU restock at NBTS Slipe Pen Road.',
    'active',
    jsonb_build_array(
      'Critical O- requirement at National Blood Transfusion Service, Kingston. Please confirm if you can donate within 24 hours.',
      'You are currently in an eligible donor group. Reply Interested or Booked so the team can secure your slot.'
    )
  ),
  (
    2,
    '00000000-0000-0000-0000-000000000102',
    'A+',
    'high',
    2,
    current_date + 1,
    'A+ units needed at St. Ann''s Bay Hospital within 24 hours for scheduled surgeries.',
    'active',
    jsonb_build_array(
      'High-priority A+ request at St. Ann''s Bay Hospital. Appointments are open today and tomorrow.',
      'If your next eligible date has passed, please mark Booked so the clinical team can prepare.'
    )
  ),
  (
    3,
    '00000000-0000-0000-0000-000000000101',
    'B+',
    'medium',
    3,
    current_date + 2,
    'B+ restock request for Savanna-la-Mar Hospital weekend demand.',
    'active',
    jsonb_build_array(
      'B+ donors are requested at Savanna-la-Mar Hospital this week.',
      'Confirm your availability and we will coordinate the closest donation slot.'
    )
  ),
  (
    4,
    '00000000-0000-0000-0000-000000000102',
    'AB-',
    'critical',
    4,
    current_date + 1,
    'Urgent AB- request for scheduled surgery support at Port Antonio Hospital.',
    'active',
    jsonb_build_array(
      'AB- blood is urgently needed for planned surgery support at Port Antonio Hospital.',
      'Please respond immediately if you can attend screening and donate in the next 24 hours.'
    )
  )
on conflict (id) do update
set
  created_by_profile_id = excluded.created_by_profile_id,
  blood_type_needed = excluded.blood_type_needed,
  urgency = excluded.urgency,
  center_id = excluded.center_id,
  required_by = excluded.required_by,
  note = excluded.note,
  status = excluded.status,
  ai_message_suggestions = excluded.ai_message_suggestions;

insert into public.appointments (
  id,
  donor_profile_id,
  created_by_profile_id,
  blood_request_id,
  center_id,
  appointment_type,
  status,
  scheduled_at,
  notes
)
values
  (1, '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 1, 1, 'donation', 'scheduled', now() + interval '18 hours', 'Priority O- slot for NBTS emergency request'),
  (2, '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 2, 2, 'donation', 'scheduled', now() + interval '20 hours', 'A+ same-day drive support'),
  (3, '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', 3, 3, 'donation', 'scheduled', now() + interval '2 days', 'Weekend restock campaign'),
  (4, '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000102', 4, 4, 'screening', 'scheduled', now() + interval '1 day', 'Repeat haemoglobin check before AB- approval'),
  (5, '00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000101', null, 5, 'donation', 'completed', now() - interval '14 days', 'Kiwanis collection day'),
  (6, '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', null, 1, 'screening', 'completed', now() - interval '92 days', 'Routine annual screening'),
  (7, '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000101', null, 5, 'blood_typing', 'scheduled', now() + interval '1 day', 'New donor onboarding and blood typing'),
  (8, '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 2, 2, 'donation', 'completed', now() - interval '64 days', 'Previous A+ surgery support')
on conflict (id) do update
set
  donor_profile_id = excluded.donor_profile_id,
  created_by_profile_id = excluded.created_by_profile_id,
  blood_request_id = excluded.blood_request_id,
  center_id = excluded.center_id,
  appointment_type = excluded.appointment_type,
  status = excluded.status,
  scheduled_at = excluded.scheduled_at,
  notes = excluded.notes;

insert into public.donation_history (
  id,
  donor_profile_id,
  center_id,
  appointment_id,
  donated_at,
  blood_type,
  units,
  notes
)
values
  (1, '00000000-0000-0000-0000-000000000206', 5, 5, now() - interval '14 days', 'A-', 1.0, 'No adverse events reported'),
  (2, '00000000-0000-0000-0000-000000000202', 2, 8, now() - interval '64 days', 'A+', 1.0, 'Post-donation observation normal'),
  (3, '00000000-0000-0000-0000-000000000201', 1, null, now() - interval '112 days', 'O-', 1.0, 'Emergency reserve contribution'),
  (4, '00000000-0000-0000-0000-000000000203', 3, null, now() - interval '82 days', 'B+', 1.0, 'Community donor drive')
on conflict (id) do update
set
  donor_profile_id = excluded.donor_profile_id,
  center_id = excluded.center_id,
  appointment_id = excluded.appointment_id,
  donated_at = excluded.donated_at,
  blood_type = excluded.blood_type,
  units = excluded.units,
  notes = excluded.notes;

insert into public.donor_alerts (
  id,
  blood_request_id,
  donor_profile_id,
  sent_by_profile_id,
  message
)
values
  (1, 1, '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'O- needed urgently at NBTS Slipe Pen Road. Can you donate within 24 hours?'),
  (2, 2, '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'A+ request at St. Ann''s Bay Hospital. Please confirm if you can attend tomorrow morning.'),
  (3, 3, '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', 'B+ donors requested at Savanna-la-Mar Hospital this week. Are you available?'),
  (4, 4, '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000102', 'AB- case at Port Antonio Hospital needs urgent support. Please update your status.'),
  (5, 2, '00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000102', 'Additional A+ support requested for St. Ann''s Bay Hospital blood bank.'),
  (6, 1, '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000101', 'O donor callout for NBTS. If available, complete onboarding and book now.')
on conflict (id) do update
set
  blood_request_id = excluded.blood_request_id,
  donor_profile_id = excluded.donor_profile_id,
  sent_by_profile_id = excluded.sent_by_profile_id,
  message = excluded.message;

insert into public.donor_alert_responses (
  id,
  alert_id,
  donor_profile_id,
  response_status,
  responded_at,
  note
)
values
  (1, 1, '00000000-0000-0000-0000-000000000201', 'booked', now() - interval '2 hours', 'Booked for NBTS 8:30 AM slot'),
  (2, 2, '00000000-0000-0000-0000-000000000202', 'interested', now() - interval '3 hours', 'Can attend after 2 PM clinic'),
  (3, 3, '00000000-0000-0000-0000-000000000203', 'booked', now() - interval '5 hours', 'Booked for Savanna-la-Mar Friday drive'),
  (4, 4, '00000000-0000-0000-0000-000000000204', 'unavailable', now() - interval '1 day', 'Awaiting medical clearance after temporary deferral'),
  (5, 5, '00000000-0000-0000-0000-000000000206', 'pending', null, null),
  (6, 6, '00000000-0000-0000-0000-000000000205', 'interested', now() - interval '4 hours', 'Interested, requesting first screening slot')
on conflict (id) do update
set
  alert_id = excluded.alert_id,
  donor_profile_id = excluded.donor_profile_id,
  response_status = excluded.response_status,
  responded_at = excluded.responded_at,
  note = excluded.note;

insert into public.notifications (
  id,
  recipient_profile_id,
  source_type,
  source_id,
  title,
  body,
  is_read
)
values
  (1, '00000000-0000-0000-0000-000000000201', 'alert', 1, 'Urgent O- request', 'NBTS Slipe Pen Road needs O- blood within 24 hours.', false),
  (2, '00000000-0000-0000-0000-000000000202', 'appointment', 2, 'A+ appointment scheduled', 'Your St. Ann''s Bay donation slot is scheduled for tomorrow.', false),
  (3, '00000000-0000-0000-0000-000000000102', 'response', 2, 'Donor response received', 'A donor marked interested for the A+ request.', false),
  (4, '00000000-0000-0000-0000-000000000103', 'request', 4, 'AB- critical request opened', 'Port Antonio Hospital AB- request is now active.', false)
on conflict (id) do update
set
  recipient_profile_id = excluded.recipient_profile_id,
  source_type = excluded.source_type,
  source_id = excluded.source_id,
  title = excluded.title,
  body = excluded.body,
  is_read = excluded.is_read;

select setval(pg_get_serial_sequence('public.blood_centers', 'id'), coalesce((select max(id) from public.blood_centers), 1), true);
select setval(pg_get_serial_sequence('public.blood_requests', 'id'), coalesce((select max(id) from public.blood_requests), 1), true);
select setval(pg_get_serial_sequence('public.appointments', 'id'), coalesce((select max(id) from public.appointments), 1), true);
select setval(pg_get_serial_sequence('public.donation_history', 'id'), coalesce((select max(id) from public.donation_history), 1), true);
select setval(pg_get_serial_sequence('public.donor_alerts', 'id'), coalesce((select max(id) from public.donor_alerts), 1), true);
select setval(pg_get_serial_sequence('public.donor_alert_responses', 'id'), coalesce((select max(id) from public.donor_alert_responses), 1), true);
select setval(pg_get_serial_sequence('public.notifications', 'id'), coalesce((select max(id) from public.notifications), 1), true);
