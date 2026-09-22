-- =============================================================
-- Fix RLS Policies (Allow full access for both Anon and Authenticated users)
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. VEHICLES
drop policy if exists "All authenticated users can view vehicles" on public.vehicles;
drop policy if exists "Owners and managers can insert vehicles" on public.vehicles;
drop policy if exists "Owners and managers can update vehicles" on public.vehicles;
drop policy if exists "Owners and managers can delete vehicles" on public.vehicles;
drop policy if exists "Allow all operations on vehicles" on public.vehicles;

create policy "Allow all operations on vehicles" on public.vehicles
  for all using (true) with check (true);

-- 2. DRIVERS
alter table public.drivers add column if not exists password text default 'password';
drop policy if exists "All authenticated users can view drivers" on public.drivers;
drop policy if exists "Authenticated users can insert drivers" on public.drivers;
drop policy if exists "Authenticated users can update drivers" on public.drivers;
drop policy if exists "Authenticated users can delete drivers" on public.drivers;
drop policy if exists "Allow all operations on drivers" on public.drivers;

create policy "Allow all operations on drivers" on public.drivers
  for all using (true) with check (true);

-- 3. DOCUMENTS
drop policy if exists "All authenticated users can manage documents" on public.documents;
drop policy if exists "Allow all operations on documents" on public.documents;

create policy "Allow all operations on documents" on public.documents
  for all using (true) with check (true);

-- 4. TRIPS
drop policy if exists "All authenticated users can manage trips" on public.trips;
drop policy if exists "Allow all operations on trips" on public.trips;

create policy "Allow all operations on trips" on public.trips
  for all using (true) with check (true);

-- 5. LIVE POSITIONS
drop policy if exists "All authenticated users can manage live_positions" on public.live_positions;
drop policy if exists "Allow all operations on live_positions" on public.live_positions;

create policy "Allow all operations on live_positions" on public.live_positions
  for all using (true) with check (true);

-- 6. EXPENSES
drop policy if exists "All authenticated users can manage expenses" on public.expenses;
drop policy if exists "Allow all operations on expenses" on public.expenses;

create policy "Allow all operations on expenses" on public.expenses
  for all using (true) with check (true);

-- 7. NOTIFICATIONS
drop policy if exists "All authenticated users can manage notifications" on public.notifications;
drop policy if exists "Allow all operations on notifications" on public.notifications;

create policy "Allow all operations on notifications" on public.notifications
  for all using (true) with check (true);

-- 8. MAINTENANCE
drop policy if exists "All authenticated users can manage maintenance" on public.maintenance;
drop policy if exists "Allow all operations on maintenance" on public.maintenance;

create policy "Allow all operations on maintenance" on public.maintenance
  for all using (true) with check (true);

-- 9. PROFILES
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Allow insert for authenticated users" on public.profiles;
drop policy if exists "Allow all operations on profiles" on public.profiles;

create policy "Allow all operations on profiles" on public.profiles
  for all using (true) with check (true);
