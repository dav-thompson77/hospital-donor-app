alter table public.profiles
  add column if not exists staff_id_number text,
  add column if not exists staff_facility text,
  add column if not exists staff_work_phone text;
