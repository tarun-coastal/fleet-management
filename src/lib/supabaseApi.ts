/**
 * supabaseApi.ts
 * All data-access functions — replaces MSW handlers and axios calls.
 * Each function maps 1-to-1 with the old mock API endpoints.
 */

import { supabase } from './supabase';
import type {
  Vehicle,
  DriverProfile,
  Trip,
  Expense,
  DocumentItem,
  MaintenanceRecord,
  AppNotification,
  LocationPing,
  User,
} from '@/types';

// ─── Helper ──────────────────────────────────────────────────────────────────
function generateId(prefix: string) {
  return `${prefix}${Date.now()}`;
}

// ─── VEHICLES ─────────────────────────────────────────────────────────────────

export async function getVehicles(search?: string, status?: string): Promise<Vehicle[]> {
  let query = supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `registration_number.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`
    );
  }
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(rowToVehicle);
}

export async function createVehicle(v: Partial<Vehicle>): Promise<Vehicle> {
  const id = generateId('v');
  const row = {
    id,
    fleet_id: 'f1',
    registration_number: (v.registrationNumber || '').toUpperCase().trim(),
    type: v.type || 'truck',
    make: v.make || '',
    model: v.model || '',
    year: v.year || 2023,
    fuel_type: v.fuelType || 'diesel',
    odometer_reading: v.odometerReading || 0,
    status: v.status || 'idle',
    assigned_driver_id: v.assignedDriverId || null,
  };

  const { data, error } = await supabase.from('vehicles').insert(row).select().single();
  if (error) throw error;

  // Create live position entry for the new vehicle
  await supabase.from('live_positions').insert({
    id: `lp_${id}`,
    vehicle_id: id,
    vehicle_reg: row.registration_number,
    driver_name: 'Unassigned',
    lat: 20.5937,
    lng: 78.9629,
    speed: 0,
    heading: 0,
    source: 'browser',
    path_history: [],
  });

  return rowToVehicle(data);
}

export async function deleteVehicle(id: string): Promise<void> {
  await supabase.from('live_positions').delete().eq('vehicle_id', id);
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
}

// ─── DRIVERS ──────────────────────────────────────────────────────────────────

export async function getDrivers(search?: string): Promise<DriverProfile[]> {
  let query = supabase.from('drivers').select('*').order('created_at', { ascending: false });
  if (search) {
    query = query.or(`name.ilike.%${search}%,license_number.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(rowToDriver);
}

export async function createDriver(form: {
  name: string;
  phone: string;
  email: string;
  password: string;
  licenseNumber: string;
  licenseExpiry: string;
  assignedVehicleReg: string;
  assignedRoute: string;
}): Promise<{ driver: DriverProfile; user: { email: string; pass: string; name: string } }> {
  const driverId = generateId('d_');

  // 1. Create Supabase Auth user for the driver
  const { data: authData, error: authError } = await supabase.auth.admin
    ? // If admin client is available use it; otherwise fallback to signUp (anon)
      { data: null, error: new Error('admin not available') }
    : { data: null, error: new Error('admin not available') };

  // Use regular signUp for driver (they confirm themselves)
  let userId = `u_${Date.now()}`;
  const { data: signUpData } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: {
      data: {
        name: form.name,
        phone: form.phone,
        role: 'driver',
        fleet_id: 'f1',
        assigned_vehicle_reg: form.assignedVehicleReg,
        assigned_route: form.assignedRoute,
      },
    },
  });
  if (signUpData?.user) {
    userId = signUpData.user.id;
  }

  // 2. Insert driver profile row
  const driverRow = {
    id: driverId,
    user_id: userId,
    name: form.name,
    email: form.email,
    phone: form.phone,
    password: form.password || 'password',
    license_number: form.licenseNumber,
    license_expiry: form.licenseExpiry,
    joining_date: new Date().toISOString().split('T')[0],
    assigned_vehicle_reg: form.assignedVehicleReg,
    assigned_route: form.assignedRoute,
    status: 'active',
  };

  let insertRes = await supabase.from('drivers').insert(driverRow).select().single();
  if (insertRes.error && (insertRes.error.message?.includes('password') || insertRes.error.code === 'PGRST204')) {
    const { password: _, ...rowWithoutPass } = driverRow;
    insertRes = await supabase.from('drivers').insert(rowWithoutPass).select().single();
  }
  if (insertRes.error) throw insertRes.error;
  const data = insertRes.data;

  // 3. Update vehicle assignment
  if (form.assignedVehicleReg) {
    await supabase
      .from('vehicles')
      .update({ assigned_driver_id: driverId })
      .eq('registration_number', form.assignedVehicleReg);

    await supabase
      .from('live_positions')
      .update({ driver_name: form.name })
      .eq('vehicle_reg', form.assignedVehicleReg);
  }

  return {
    driver: rowToDriver(data),
    user: { email: form.email, pass: form.password, name: form.name },
  };
}

export async function deleteDriver(id: string): Promise<void> {
  const { error } = await supabase.from('drivers').delete().eq('id', id);
  if (error) throw error;
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export async function getDocuments(): Promise<DocumentItem[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToDocument);
}

export async function getDocumentsByVehicle(vehicleRegOrId: string): Promise<DocumentItem[]> {
  const clean = (vehicleRegOrId || '').trim();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .or(`owner_id.eq.${clean},owner_name.ilike.${clean}`)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToDocument);
}

export async function createDocument(doc: Partial<DocumentItem>): Promise<DocumentItem> {
  const row = {
    id: generateId('doc'),
    owner_type: doc.ownerType || 'vehicle',
    owner_id: doc.ownerId || doc.ownerName || '',
    owner_name: doc.ownerName || doc.ownerId || '',
    doc_type: doc.docType || 'insurance',
    file_url: doc.fileUrl || '#',
    issue_date: doc.issueDate || new Date().toISOString().split('T')[0],
    expiry_date: doc.expiryDate || '2027-01-01',
    verified: false,
  };
  const { data, error } = await supabase.from('documents').insert(row).select().single();
  if (error) throw error;
  return rowToDocument(data);
}

export async function verifyDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').update({ verified: true }).eq('id', id);
  if (error) throw error;
}

export async function renewDocument(id: string, expiryDate: string, fileUrl?: string): Promise<void> {
  const updateData: any = {
    expiry_date: expiryDate,
    verified: true,
    issue_date: new Date().toISOString().split('T')[0],
  };
  if (fileUrl) {
    updateData.file_url = fileUrl;
  }
  const { error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

// ─── TRIPS ────────────────────────────────────────────────────────────────────

export async function getTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToTrip);
}

export async function startTrip(params: {
  vehicleReg: string;
  driverName: string;
  lat: number;
  lng: number;
  notes?: string;
}): Promise<Trip> {
  const id = generateId('t');
  const row = {
    id,
    vehicle_id: params.vehicleReg,
    driver_id: params.driverName,
    start_time: new Date().toISOString(),
    start_lat: params.lat,
    start_lng: params.lng,
    distance_km: 0,
    status: 'ongoing',
    notes: params.notes || 'Trip in progress',
    path_history: [[params.lat, params.lng]],
  };

  const { data, error } = await supabase.from('trips').insert(row).select().single();
  if (error) throw error;

  // Upsert live position
  await pingTracking({
    vehicleReg: params.vehicleReg,
    driverName: params.driverName,
    lat: params.lat,
    lng: params.lng,
    speed: 0,
    heading: 90,
  });

  // Set vehicle active
  await supabase
    .from('vehicles')
    .update({ status: 'active' })
    .eq('registration_number', params.vehicleReg);

  return rowToTrip(data);
}

export async function endTrip(
  id: string,
  params: { lat: number; lng: number; distanceKm: number }
): Promise<void> {
  // Get the trip first to grab the vehicle_id
  const { data: trip } = await supabase.from('trips').select('vehicle_id').eq('id', id).single();

  const { error } = await supabase
    .from('trips')
    .update({
      status: 'completed',
      end_time: new Date().toISOString(),
      end_lat: params.lat,
      end_lng: params.lng,
      distance_km: params.distanceKm,
    })
    .eq('id', id);
  if (error) throw error;

  // Reset vehicle to idle and bump odometer
  if (trip?.vehicle_id) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('odometer_reading')
      .eq('registration_number', trip.vehicle_id)
      .single();

    if (vehicle) {
      await supabase
        .from('vehicles')
        .update({
          status: 'idle',
          odometer_reading: vehicle.odometer_reading + Math.round(params.distanceKm),
        })
        .eq('registration_number', trip.vehicle_id);
    }
  }
}

// ─── TRACKING ─────────────────────────────────────────────────────────────────

export async function getLivePositions(): Promise<LocationPing[]> {
  // 1. Fetch currently registered vehicle registration numbers
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('registration_number');

  const registeredRegs = new Set(
    (vehicles || []).map((v: any) => (v.registration_number || '').toUpperCase().trim())
  );

  const { data, error } = await supabase
    .from('live_positions')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;

  // 2. Only return 1 position per vehicle registration (deduplicate by vehicle_reg)
  const uniquePositionsMap = new Map<string, any>();
  for (const p of (data || [])) {
    const reg = (p.vehicle_reg || '').toUpperCase().trim();
    if (registeredRegs.has(reg) && !uniquePositionsMap.has(reg)) {
      uniquePositionsMap.set(reg, p);
    }
  }

  return Array.from(uniquePositionsMap.values()).map(rowToLocationPing);
}

export async function pingTracking(params: {
  vehicleReg: string;
  vehicleId?: string;
  driverName?: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
}): Promise<LocationPing> {
  const cleanReg = (params.vehicleReg || '').trim();

  // Find any existing live_positions entry for this vehicle
  const { data: existingList } = await supabase
    .from('live_positions')
    .select('*')
    .eq('vehicle_reg', cleanReg)
    .order('timestamp', { ascending: false });

  const existing = existingList && existingList.length > 0 ? existingList[0] : null;

  // Cleanup duplicate rows if any exist for this vehicle
  if (existingList && existingList.length > 1) {
    const duplicateIds = existingList.slice(1).map(r => r.id);
    await supabase.from('live_positions').delete().in('id', duplicateIds);
  }

  const newPoint = [params.lat, params.lng];
  const now = new Date().toISOString();

  if (existing) {
    const currentHistory: [number, number][] = existing.path_history || [];
    const lastPt = currentHistory[currentHistory.length - 1];
    const shouldAppend =
      !lastPt ||
      Math.abs(lastPt[0] - params.lat) > 0.00005 ||
      Math.abs(lastPt[1] - params.lng) > 0.00005;

    const updatedHistory = shouldAppend ? [...currentHistory, newPoint] : currentHistory;

    const { data, error } = await supabase
      .from('live_positions')
      .update({
        lat: params.lat,
        lng: params.lng,
        speed: params.speed,
        heading: params.heading,
        timestamp: now,
        source: 'browser',
        path_history: updatedHistory,
        driver_name: params.driverName || existing.driver_name,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return rowToLocationPing(data);
  } else {
    const id = `lp_${Date.now()}`;
    const { data, error } = await supabase
      .from('live_positions')
      .insert({
        id,
        vehicle_id: params.vehicleId || `v_${Date.now()}`,
        vehicle_reg: cleanReg,
        driver_name: params.driverName || 'Driver',
        lat: params.lat,
        lng: params.lng,
        speed: params.speed,
        heading: params.heading,
        source: 'browser',
        timestamp: now,
        path_history: [newPoint],
      })
      .select()
      .single();

    if (error) throw error;
    return rowToLocationPing(data);
  }
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export async function getExpenses(category?: string, approved?: string): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').order('created_at', { ascending: false });
  if (category && category !== 'all') query = query.eq('category', category);
  if (approved && approved !== 'all') query = query.eq('approved', approved);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(rowToExpense);
}

export async function createExpense(exp: Partial<Expense>): Promise<Expense> {
  const row = {
    id: generateId('e'),
    vehicle_id: exp.vehicleId || '',
    driver_id: exp.driverId || '',
    category: exp.category || 'fuel',
    amount: exp.amount || 0,
    date: exp.date || new Date().toISOString().split('T')[0],
    notes: exp.notes || '',
    receipt_photo_url: exp.receiptPhotoUrl || null,
    odometer_at_entry: exp.odometerAtEntry || null,
    approved: 'pending',
  };
  const { data, error } = await supabase.from('expenses').insert(row).select().single();
  if (error) throw error;
  return rowToExpense(data);
}

export async function approveExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ approved: 'approved', approved_by: 'Fleet Owner' })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ approved: 'rejected', approved_by: 'Fleet Owner' })
    .eq('id', id);
  if (error) throw error;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function getNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
  if (error) throw error;
}

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────

export async function getMaintenance(): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('maintenance')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToMaintenance);
}

export async function createMaintenance(rec: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
  const row = {
    id: generateId('m'),
    vehicle_id: rec.vehicleId || '',
    title: rec.title || 'Maintenance',
    description: rec.description || '',
    scheduled_date: rec.scheduledDate || new Date().toISOString().split('T')[0],
    status: rec.status || 'scheduled',
    cost: rec.cost || 0,
    odometer_reading: rec.odometerReading || null,
  };
  const { data, error } = await supabase.from('maintenance').insert(row).select().single();
  if (error) throw error;
  return rowToMaintenance(data);
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export async function getAnalyticsSummary() {
  const [vehiclesRes, tripsRes, docsRes, expensesRes] = await Promise.all([
    supabase.from('vehicles').select('id', { count: 'exact', head: true }),
    supabase.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'ongoing'),
    supabase
      .from('documents')
      .select('expiry_date')
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .lte(
        'expiry_date',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      ),
    supabase.from('expenses').select('amount'),
  ]);

  const totalExpense = (expensesRes.data || []).reduce(
    (sum: number, e: any) => sum + (e.amount || 0),
    0
  );

  return {
    totalVehicles: vehiclesRes.count ?? 0,
    activeTrips: tripsRes.count ?? 0,
    pendingDocs: (docsRes.data || []).length,
    totalExpense,
    currency: '₹',
  };
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function loginWithEmail(
  identifier: string,
  password: string
): Promise<{ user: User; token: string }> {
  const cleanId = (identifier || '').trim();
  const cleanEmail = cleanId.toLowerCase();
  const cleanPhone = cleanId.replace(/[^0-9]/g, '');

  // 1. Try standard Supabase Auth signInWithPassword if identifier looks like an email
  if (cleanEmail.includes('@')) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!authError && authData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        const user: User = {
          id: authData.user.id,
          name: profile?.name || authData.user.email || 'User',
          email: authData.user.email || '',
          phone: profile?.phone || '',
          role: (profile?.role as any) || 'driver',
          fleetId: profile?.fleet_id || 'f1',
          createdAt: authData.user.created_at,
          assignedVehicleId: profile?.assigned_vehicle_id,
          assignedVehicleReg: profile?.assigned_vehicle_reg,
          assignedRoute: profile?.assigned_route,
        };

        return { user, token: authData.session?.access_token || '' };
      }
    } catch (e) {
      // Continue to drivers table fallback
    }
  }

  // 2. Search in Supabase `drivers` table (by email, name, phone, or license)
  const { data: drivers } = await supabase
    .from('drivers')
    .select('*');

  if (drivers && drivers.length > 0) {
    const driver = drivers.find((d: any) => {
      const dEmail = (d.email || '').toLowerCase().trim();
      const dName = (d.name || '').toLowerCase().trim();
      const dPhone = (d.phone || '').replace(/[^0-9]/g, '');
      const dLicense = (d.license_number || '').toLowerCase().trim();
      const target = cleanEmail;

      return (
        dEmail === target ||
        dName === target ||
        (target.length >= 2 && dName.includes(target)) ||
        (target.length >= 2 && target.includes(dName)) ||
        dLicense === target ||
        (cleanPhone.length >= 4 && dPhone.includes(cleanPhone))
      );
    });

    if (driver) {
      // Validate password if configured (also accept 'password' for easy dev/demo access)
      if (driver.password && driver.password !== password && password !== 'password') {
        throw new Error('Invalid password for this driver account.');
      }

      const user: User = {
        id: driver.user_id || driver.id,
        name: driver.name || 'Fleet Driver',
        email: driver.email || `${driver.id}@fleet.com`,
        phone: driver.phone || '',
        role: 'driver',
        fleetId: 'f1',
        createdAt: driver.created_at || new Date().toISOString(),
        assignedVehicleId: driver.assigned_vehicle_id,
        assignedVehicleReg: driver.assigned_vehicle_reg,
        assignedRoute: driver.assigned_route,
      };

      return { user, token: `driver-session-${driver.id}` };
    }
  }

  // 2b. Search in Supabase `profiles` table (for registered owners/managers)
  const { data: profiles } = await supabase.from('profiles').select('*');
  if (profiles && profiles.length > 0) {
    const profile = profiles.find((p: any) => {
      const pName = (p.name || '').toLowerCase().trim();
      const pPhone = (p.phone || '').replace(/[^0-9]/g, '');
      const target = cleanEmail;

      return (
        (target.length >= 2 && pName.includes(target)) ||
        (cleanPhone.length >= 4 && pPhone.includes(cleanPhone))
      );
    });

    if (profile) {
      return {
        token: `profile-session-${profile.id}`,
        user: {
          id: profile.id,
          name: profile.name || 'User',
          email: cleanEmail.includes('@') ? cleanId : 'user@fleet.com',
          phone: profile.phone || '',
          role: (profile.role as any) || 'owner',
          fleetId: profile.fleet_id || 'f1',
          createdAt: profile.created_at || new Date().toISOString(),
          assignedVehicleId: profile.assigned_vehicle_id,
          assignedVehicleReg: profile.assigned_vehicle_reg,
          assignedRoute: profile.assigned_route,
        }
      };
    }
  }

  // 3. Fallback demo driver / owner accounts
  if (cleanEmail === 'driver@test.com' || cleanEmail === 'driver') {
    return {
      token: 'driver-jwt-demo',
      user: {
        id: 'd_demo',
        name: 'Demo Driver',
        email: 'driver@test.com',
        phone: '+91 98765 43210',
        role: 'driver',
        fleetId: 'f1',
        createdAt: new Date().toISOString(),
        assignedVehicleReg: 'KA 01 AB 1234',
        assignedRoute: 'Bengaluru to Chennai Highway Corridor'
      }
    };
  }

  if (cleanEmail === 'owner@test.com' || cleanEmail === 'owner') {
    return {
      token: 'owner-jwt-demo',
      user: {
        id: 'u_owner',
        name: 'Fleet Owner',
        email: 'owner@test.com',
        phone: '+91 98765 00000',
        role: 'owner',
        fleetId: 'f1',
        createdAt: new Date().toISOString()
      }
    };
  }

  throw new Error('Invalid login identifier or password. Please verify your driver details.');
}

export async function signupOwner(params: {
  name: string;
  email: string;
  phone: string;
  password: string;
  fleetName: string;
}): Promise<{ user: User; token: string }> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        name: params.name,
        phone: params.phone,
        role: 'owner',
        fleet_id: `f_${Date.now()}`,
        fleet_name: params.fleetName,
      },
    },
  });
  if (error) throw error;

  const user: User = {
    id: data.user?.id || `u${Date.now()}`,
    name: params.name,
    email: params.email,
    phone: params.phone,
    role: 'owner',
    fleetId: `f_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  return { user, token: data.session?.access_token || '' };
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}

// ─── Row Mappers (snake_case DB → camelCase TS types) ─────────────────────────

function rowToVehicle(r: any): Vehicle {
  return {
    id: r.id,
    fleetId: r.fleet_id,
    registrationNumber: r.registration_number,
    type: r.type,
    make: r.make,
    model: r.model,
    year: r.year,
    fuelType: r.fuel_type,
    odometerReading: r.odometer_reading,
    assignedDriverId: r.assigned_driver_id,
    status: r.status,
    trackerDeviceId: r.tracker_device_id,
    photoUrl: r.photo_url,
  };
}

function rowToDriver(r: any): DriverProfile {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    licenseNumber: r.license_number,
    licenseExpiry: r.license_expiry,
    licensePhotoUrl: r.license_photo_url,
    idProofUrl: r.id_proof_url,
    joiningDate: r.joining_date,
    assignedVehicleId: r.assigned_vehicle_id,
    assignedVehicleReg: r.assigned_vehicle_reg,
    assignedRoute: r.assigned_route,
    status: r.status,
  };
}

function rowToDocument(r: any): DocumentItem {
  return {
    id: r.id,
    ownerType: r.owner_type,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    docType: r.doc_type,
    fileUrl: r.file_url,
    issueDate: r.issue_date,
    expiryDate: r.expiry_date,
    verified: r.verified,
    uploadedAt: r.uploaded_at,
  };
}

function rowToTrip(r: any): Trip {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    driverId: r.driver_id,
    startTime: r.start_time,
    endTime: r.end_time,
    startLat: r.start_lat,
    startLng: r.start_lng,
    endLat: r.end_lat,
    endLng: r.end_lng,
    routePolyline: r.route_polyline,
    pathHistory: r.path_history,
    distanceKm: r.distance_km,
    status: r.status,
    notes: r.notes,
  };
}

function rowToLocationPing(r: any): LocationPing {
  return {
    id: r.id,
    tripId: r.trip_id,
    vehicleId: r.vehicle_id,
    vehicleReg: r.vehicle_reg,
    driverName: r.driver_name,
    lat: r.lat,
    lng: r.lng,
    speed: r.speed,
    heading: r.heading,
    source: r.source,
    timestamp: r.timestamp,
    pathHistory: r.path_history,
  };
}

function rowToExpense(r: any): Expense {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    driverId: r.driver_id,
    category: r.category,
    amount: r.amount,
    date: r.date,
    receiptPhotoUrl: r.receipt_photo_url,
    odometerAtEntry: r.odometer_at_entry,
    notes: r.notes,
    approved: r.approved,
    approvedBy: r.approved_by,
  };
}

function rowToNotification(r: any): AppNotification {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    message: r.message,
    linkTo: r.link_to,
    read: r.read,
    createdAt: r.created_at,
  };
}

function rowToMaintenance(r: any): MaintenanceRecord {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    title: r.title,
    description: r.description,
    scheduledDate: r.scheduled_date,
    status: r.status,
    cost: r.cost,
    odometerReading: r.odometer_reading,
  };
}
