-- =============================================================
-- Fleet Management - Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================================
-- PROFILES (extends auth.users)
-- =============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  role text not null default 'driver' check (role in ('owner', 'manager', 'driver')),
  fleet_id text not null default 'f1',
  profile_photo_url text,
  assigned_vehicle_id text,
  assigned_vehicle_reg text,
  assigned_route text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Allow all operations on profiles" on public.profiles for all using (true) with check (true);

-- Trigger: auto-create profile row when user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, phone, role, fleet_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'driver'),
    coalesce(new.raw_user_meta_data->>'fleet_id', 'f1')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================
-- VEHICLES
-- =============================================================
create table if not exists public.vehicles (
  id text primary key default 'v' || extract(epoch from now())::bigint::text,
  fleet_id text not null default 'f1',
  registration_number text not null unique,
  type text not null default 'truck' check (type in ('truck', 'van', 'car', 'bike', 'bus')),
  make text not null default '',
  model text not null default '',
  year integer not null default 2023,
  fuel_type text not null default 'diesel' check (fuel_type in ('petrol', 'diesel', 'cng', 'electric', 'hybrid')),
  odometer_reading numeric not null default 0,
  assigned_driver_id text,
  status text not null default 'idle' check (status in ('active', 'inService', 'idle', 'maintenance')),
  tracker_device_id text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;
create policy "Allow all operations on vehicles" on public.vehicles for all using (true) with check (true);

-- =============================================================
-- DRIVERS
-- =============================================================
create table if not exists public.drivers (
  id text primary key default 'd' || extract(epoch from now())::bigint::text,
  user_id text,
  name text,
  email text,
  phone text,
  license_number text not null,
  license_expiry text not null,
  license_photo_url text,
  id_proof_url text,
  joining_date text not null default to_char(now(), 'YYYY-MM-DD'),
  assigned_vehicle_id text,
  assigned_vehicle_reg text,
  assigned_route text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

alter table public.drivers enable row level security;
create policy "Allow all operations on drivers" on public.drivers for all using (true) with check (true);

-- =============================================================
-- DOCUMENTS
-- =============================================================
create table if not exists public.documents (
  id text primary key default 'doc' || extract(epoch from now())::bigint::text,
  owner_type text not null check (owner_type in ('vehicle', 'driver')),
  owner_id text not null,
  owner_name text,
  doc_type text not null check (doc_type in ('license', 'rc', 'insurance', 'permit', 'puc', 'fitness', 'idProof')),
  file_url text not null default '#',
  issue_date text not null,
  expiry_date text not null,
  verified boolean not null default false,
  uploaded_at timestamptz not null default now()
);

alter table public.documents enable row level security;
create policy "Allow all operations on documents" on public.documents for all using (true) with check (true);

-- =============================================================
-- TRIPS
-- =============================================================
create table if not exists public.trips (
  id text primary key default 't' || extract(epoch from now())::bigint::text,
  vehicle_id text not null,
  driver_id text not null,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  route_polyline text,
  path_history jsonb default '[]'::jsonb,
  distance_km numeric default 0,
  status text not null default 'ongoing' check (status in ('ongoing', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;
create policy "Allow all operations on trips" on public.trips for all using (true) with check (true);

-- =============================================================
-- LIVE POSITIONS
-- =============================================================
create table if not exists public.live_positions (
  id text primary key default 'lp_' || extract(epoch from now())::bigint::text,
  trip_id text,
  vehicle_id text not null,
  vehicle_reg text,
  driver_name text,
  lat numeric not null default 20.5937,
  lng numeric not null default 78.9629,
  speed numeric not null default 0,
  heading numeric not null default 0,
  source text not null default 'browser',
  timestamp timestamptz not null default now(),
  path_history jsonb default '[]'::jsonb
);

alter table public.live_positions enable row level security;
create policy "Allow all operations on live_positions" on public.live_positions for all using (true) with check (true);

-- =============================================================
-- EXPENSES
-- =============================================================
create table if not exists public.expenses (
  id text primary key default 'e' || extract(epoch from now())::bigint::text,
  vehicle_id text not null,
  driver_id text not null,
  category text not null check (category in ('fuel', 'toll', 'maintenance', 'repair', 'fine', 'other')),
  amount numeric not null default 0,
  date text not null,
  receipt_photo_url text,
  odometer_at_entry numeric,
  notes text,
  approved text not null default 'pending' check (approved in ('pending', 'approved', 'rejected')),
  approved_by text,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
create policy "Allow all operations on expenses" on public.expenses for all using (true) with check (true);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================
create table if not exists public.notifications (
  id text primary key default 'n' || extract(epoch from now())::bigint::text,
  user_id text not null,
  type text not null check (type in ('docExpiry', 'maintenanceDue', 'tripAlert', 'expenseSubmitted', 'driverInvited')),
  message text not null,
  link_to text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "Allow all operations on notifications" on public.notifications for all using (true) with check (true);

-- =============================================================
-- MAINTENANCE
-- =============================================================
create table if not exists public.maintenance (
  id text primary key default 'm' || extract(epoch from now())::bigint::text,
  vehicle_id text not null,
  title text not null,
  description text,
  scheduled_date text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  cost numeric default 0,
  odometer_reading numeric,
  created_at timestamptz not null default now()
);

alter table public.maintenance enable row level security;
create policy "Allow all operations on maintenance" on public.maintenance for all using (true) with check (true);
