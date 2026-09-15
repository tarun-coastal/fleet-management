import { http, HttpResponse } from 'msw';
import { db, saveDB, reloadDB } from './db';
import type { Vehicle, DriverProfile, Trip, Expense, DocumentItem, MaintenanceRecord, User } from '@/types';

export const handlers = [
  // Auth
  http.post('/auth/login', async ({ request }) => {
    reloadDB();
    const { email, password } = await request.json() as any;
    const identifier = (email || '').toString().trim().toLowerCase();
    const cleanPhone = identifier.replace(/[^0-9]/g, '');

    // 1. Search in db.users (by email, name, or phone)
    let userFound = db.users?.find(u => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uName = (u.name || '').toLowerCase().trim();
      const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
      return (
        uEmail === identifier ||
        uName === identifier ||
        (cleanPhone.length >= 6 && uPhone.includes(cleanPhone))
      );
    });

    // 2. If not found in db.users, also search in db.drivers!
    if (!userFound && db.drivers) {
      const driver = db.drivers.find(d => {
        const dEmail = (d.email || '').toLowerCase().trim();
        const dName = (d.name || '').toLowerCase().trim();
        const dLicense = (d.licenseNumber || '').toLowerCase().trim();
        const dPhone = (d.phone || '').replace(/[^0-9]/g, '');
        return (
          dEmail === identifier ||
          dName === identifier ||
          dLicense === identifier ||
          (cleanPhone.length >= 6 && dPhone.includes(cleanPhone))
        );
      });

      if (driver) {
        const autoUser: User & { password?: string } = {
          id: driver.userId || driver.id,
          name: driver.name || 'Fleet Driver',
          email: driver.email || `${driver.id}@fleet.com`,
          role: 'driver',
          fleetId: 'f1',
          phone: driver.phone || '+91 99999 88888',
          createdAt: new Date().toISOString(),
          assignedVehicleId: driver.assignedVehicleId,
          assignedVehicleReg: driver.assignedVehicleReg,
          assignedRoute: driver.assignedRoute,
          password: 'password'
        };
        userFound = autoUser;
        if (!db.users) db.users = [];
        db.users.push(autoUser);
        saveDB();
      }
    }

    if (userFound) {
      // Validate password if configured, also accept 'password' as universal dev fallback
      if (userFound.password && userFound.password !== password && password !== 'password') {
        return new HttpResponse('Invalid credentials', { status: 401 });
      }
      const { password: _, ...safeUser } = userFound;
      return HttpResponse.json({
        token: `mock-jwt-${safeUser.role}-${safeUser.id}`,
        user: safeUser
      });
    }

    // 3. Fallback demo accounts
    if ((identifier === 'owner@test.com' || identifier === 'owner') && (password === 'password' || !password)) {
      return HttpResponse.json({
        token: 'mock-jwt-owner',
        user: { id: '1', name: 'Fleet Owner', email: 'owner@test.com', role: 'owner', fleetId: 'f1', phone: '+91 98765 00000', createdAt: '2024-01-01T00:00:00Z' }
      });
    }

    if ((identifier === 'manager@test.com' || identifier === 'manager') && (password === 'password' || !password)) {
      return HttpResponse.json({
        token: 'mock-jwt-manager',
        user: { id: '5', name: 'Operations Manager', email: 'manager@test.com', role: 'manager', fleetId: 'f1', phone: '+91 98765 11111', createdAt: '2024-01-01T00:00:00Z' }
      });
    }

    if ((identifier === 'driver@test.com' || identifier === 'driver') && (password === 'password' || !password)) {
      const activeVehicle = db.vehicles[0]?.registrationNumber || 'KA 01 AB 1234';
      return HttpResponse.json({
        token: 'mock-jwt-driver',
        user: { 
          id: '2', 
          name: 'Demo Driver', 
          email: 'driver@test.com', 
          role: 'driver', 
          fleetId: 'f1', 
          phone: '+91 98765 43210', 
          createdAt: '2024-01-01T00:00:00Z',
          assignedVehicleId: db.vehicles[0]?.id || 'v1',
          assignedVehicleReg: activeVehicle,
          assignedRoute: 'Bengaluru to Chennai Highway Corridor'
        }
      });
    }

    return new HttpResponse('Unauthorized: invalid credentials', { status: 401 });
  }),

  http.post('/auth/signup', async () => {
    return HttpResponse.json({ success: true, message: 'Owner registered successfully' });
  }),

  http.get('/auth/me', () => {
    return HttpResponse.json({
      id: '1',
      name: 'Tarun (Owner)',
      email: 'owner@test.com',
      role: 'owner',
      fleetId: 'f1'
    });
  }),

  // Vehicles
  http.get('/vehicles', ({ request }) => {
    reloadDB();
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const status = url.searchParams.get('status');

    let results = [...db.vehicles];
    if (search) {
      results = results.filter(v => 
        v.registrationNumber.toLowerCase().includes(search) || 
        v.make.toLowerCase().includes(search) || 
        v.model.toLowerCase().includes(search)
      );
    }
    if (status && status !== 'all') {
      results = results.filter(v => v.status === status);
    }
    return HttpResponse.json({ results, count: results.length });
  }),

  http.post('/vehicles', async ({ request }) => {
    const data = await request.json() as Partial<Vehicle>;
    const newVehicle: Vehicle = {
      id: `v${Date.now()}`,
      fleetId: 'f1',
      registrationNumber: (data.registrationNumber || '').toUpperCase().trim(),
      type: data.type || 'truck',
      make: data.make || 'Tata',
      model: data.model || 'Signa',
      year: data.year || 2023,
      fuelType: data.fuelType || 'diesel',
      odometerReading: data.odometerReading || 0,
      status: data.status || 'idle',
      assignedDriverId: data.assignedDriverId
    };
    db.vehicles.unshift(newVehicle);

    // Create livePosition entry for this newly added vehicle
    if (!db.livePositions) db.livePositions = [];
    db.livePositions.unshift({
      id: `lp_${newVehicle.id}`,
      vehicleId: newVehicle.id,
      vehicleReg: newVehicle.registrationNumber,
      driverName: 'Unassigned',
      lat: 20.5937,
      lng: 78.9629,
      speed: 0,
      heading: 0,
      source: 'browser',
      timestamp: new Date().toISOString(),
      pathHistory: []
    });

    saveDB();
    return HttpResponse.json(newVehicle, { status: 201 });
  }),

  http.delete('/vehicles/:id', ({ params }) => {
    const vehicle = db.vehicles.find(v => v.id === params.id);
    db.vehicles = db.vehicles.filter(v => v.id !== params.id);
    if (vehicle && db.livePositions) {
      db.livePositions = db.livePositions.filter(p => p.vehicleId !== params.id && p.vehicleReg !== vehicle.registrationNumber);
    }
    saveDB();
    return HttpResponse.json({ success: true });
  }),

  // Drivers
  http.get('/drivers', ({ request }) => {
    reloadDB();
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    let results = [...(db.drivers || [])];
    if (search) {
      results = results.filter(d => 
        (d.name && d.name.toLowerCase().includes(search)) || 
        d.licenseNumber.toLowerCase().includes(search)
      );
    }
    return HttpResponse.json({ results, count: results.length });
  }),

  http.post('/drivers', async ({ request }) => {
    const data = await request.json() as any;
    const newUserId = `u_${Date.now()}`;
    const newDriverId = `d_${Date.now()}`;

    const name = data.name || 'New Driver';
    const email = (data.email || `driver_${Date.now()}@fleet.com`).toLowerCase().trim();
    const password = data.password || 'password';
    const phone = data.phone || '+91 99999 88888';
    const assignedVehicleReg = data.assignedVehicleReg || data.assignedVehicleId || '';
    const assignedRoute = data.assignedRoute || 'General corridor delivery';

    // 1. Create login credentials in db.users
    const newUser = {
      id: newUserId,
      name,
      email,
      password,
      role: 'driver' as const,
      fleetId: 'f1',
      phone,
      createdAt: new Date().toISOString(),
      assignedVehicleId: data.assignedVehicleId || 'v1',
      assignedVehicleReg,
      assignedRoute
    };
    if (!db.users) db.users = [];
    db.users.push(newUser);

    // 2. Create DriverProfile in db.drivers
    const newDriver: DriverProfile = {
      id: newDriverId,
      userId: newUserId,
      name,
      email,
      phone,
      licenseNumber: data.licenseNumber || 'DL-PENDING',
      licenseExpiry: data.licenseExpiry || '2028-12-31',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'active',
      assignedVehicleId: data.assignedVehicleId,
      assignedVehicleReg,
      assignedRoute
    };
    if (!db.drivers) db.drivers = [];
    db.drivers.unshift(newDriver);

    // 3. Update Vehicle allocation
    if (assignedVehicleReg) {
      const vehicle = db.vehicles.find(v => v.registrationNumber === assignedVehicleReg || v.id === data.assignedVehicleId);
      if (vehicle) {
        vehicle.assignedDriverId = newDriverId;
      }
      const livePos = db.livePositions?.find(p => p.vehicleReg === assignedVehicleReg || p.vehicleId === data.assignedVehicleId);
      if (livePos) {
        livePos.driverName = name;
      }
    }

    saveDB();
    return HttpResponse.json({ driver: newDriver, user: newUser }, { status: 201 });
  }),

  http.delete('/drivers/:id', ({ params }) => {
    db.drivers = (db.drivers || []).filter(d => d.id !== params.id);
    saveDB();
    return HttpResponse.json({ success: true });
  }),

  // Documents
  http.get('/documents', () => {
    return HttpResponse.json({ results: db.documents || [], count: (db.documents || []).length });
  }),

  http.post('/documents', async ({ request }) => {
    const data = await request.json() as Partial<DocumentItem>;
    const newDoc: DocumentItem = {
      id: `doc${Date.now()}`,
      ownerType: data.ownerType || 'vehicle',
      ownerId: data.ownerId || 'v1',
      ownerName: data.ownerName || 'Vehicle Doc',
      docType: data.docType || 'insurance',
      fileUrl: '#',
      issueDate: data.issueDate || '2026-01-01',
      expiryDate: data.expiryDate || '2027-01-01',
      verified: false,
      uploadedAt: new Date().toISOString()
    };
    if (!db.documents) db.documents = [];
    db.documents.unshift(newDoc);
    saveDB();
    return HttpResponse.json(newDoc, { status: 201 });
  }),

  http.put('/documents/:id/verify', ({ params }) => {
    const doc = db.documents.find(d => d.id === params.id);
    if (doc) doc.verified = true;
    saveDB();
    return HttpResponse.json({ success: true, doc });
  }),

  http.put('/documents/:id/renew', async ({ params, request }) => {
    const data = await request.json() as any;
    const doc = db.documents.find(d => d.id === params.id);
    if (doc) {
      doc.issueDate = data.issueDate || new Date().toISOString().split('T')[0];
      doc.expiryDate = data.expiryDate;
      doc.verified = true;
    }
    saveDB();
    return HttpResponse.json({ success: true, doc });
  }),

  // Trips
  http.get('/trips', () => {
    return HttpResponse.json({ results: db.trips || [], count: (db.trips || []).length });
  }),

  http.post('/trips/start', async ({ request }) => {
    const data = await request.json() as any;
    const vehicleReg = (data.vehicleReg || data.vehicleId || '').toUpperCase().trim();
    const driverName = data.driverName || data.driverId || 'Driver';
    const lat = Number(data.lat) || 18.5204;
    const lng = Number(data.lng) || 73.8567;

    // Start Point A coordinates
    const startPoint: [number, number] = [lat, lng];

    const newTrip: Trip = {
      id: `t${Date.now()}`,
      vehicleId: vehicleReg,
      driverId: driverName,
      startTime: new Date().toISOString(),
      startLat: lat,
      startLng: lng,
      distanceKm: 0,
      status: 'ongoing',
      notes: data.notes || 'Trip in progress',
      pathHistory: [startPoint]
    };
    if (!db.trips) db.trips = [];
    db.trips.unshift(newTrip);

    // Update vehicle livePosition with Point A start and initialize journey trail
    if (!db.livePositions) db.livePositions = [];
    let livePos = db.livePositions.find(p => p.vehicleReg === vehicleReg);
    if (livePos) {
      livePos.lat = lat;
      livePos.lng = lng;
      livePos.speed = 0;
      livePos.heading = 90;
      livePos.driverName = driverName;
      livePos.source = 'browser';
      livePos.timestamp = new Date().toISOString();
      livePos.pathHistory = [startPoint];
    } else {
      livePos = {
        id: `lp_${Date.now()}`,
        vehicleId: `v_${Date.now()}`,
        vehicleReg,
        driverName,
        lat,
        lng,
        speed: 0,
        heading: 90,
        source: 'browser',
        timestamp: new Date().toISOString(),
        pathHistory: [startPoint]
      };
      db.livePositions.unshift(livePos);
    }

    // Mark vehicle active
    const vehicle = db.vehicles.find(v => v.registrationNumber === vehicleReg);
    if (vehicle) {
      vehicle.status = 'active';
    }

    saveDB();
    return HttpResponse.json(newTrip, { status: 201 });
  }),

  http.post('/trips/:id/end', async ({ params, request }) => {
    const data = await request.json() as any;
    const trip = db.trips.find(t => t.id === params.id);
    if (trip) {
      trip.status = 'completed';
      trip.endTime = new Date().toISOString();
      trip.endLat = Number(data.lat) || trip.startLat;
      trip.endLng = Number(data.lng) || trip.startLng;
      trip.distanceKm = Number(data.distanceKm) || 0;

      // Finalize pathHistory from livePos
      const livePos = db.livePositions.find(p => p.vehicleReg === trip.vehicleId);
      if (livePos) {
        livePos.speed = 0;
        livePos.lat = trip.endLat;
        livePos.lng = trip.endLng;
        trip.pathHistory = livePos.pathHistory || [[trip.startLat, trip.startLng], [trip.endLat, trip.endLng]];
        livePos.timestamp = new Date().toISOString();
      }

      // Update vehicle status
      const vehicle = db.vehicles.find(v => v.registrationNumber === trip.vehicleId);
      if (vehicle) {
        vehicle.odometerReading += Math.round(trip.distanceKm);
        vehicle.status = 'idle';
      }
    }
    saveDB();
    return HttpResponse.json({ success: true, trip });
  }),

  // Continuous Telemetry Ping: Appends [lat, lng] to pathHistory from Point A to Point B!
  http.post('/tracking/ping', async ({ request }) => {
    reloadDB();
    const data = await request.json() as any;
    const vehicleReg = (data.vehicleReg || '').toUpperCase().trim();
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    const speed = typeof data.speed === 'number' ? data.speed : (Number(data.speed) || 0);
    const heading = Number(data.heading) || 90;

    if (!db.livePositions) db.livePositions = [];
    let target = db.livePositions.find(p => p.vehicleReg === vehicleReg);
    const newPoint: [number, number] = [lat, lng];

    if (target) {
      target.lat = lat;
      target.lng = lng;
      target.speed = speed;
      target.heading = heading;
      target.timestamp = new Date().toISOString();
      target.source = 'browser';
      if (!target.pathHistory) target.pathHistory = [];
      const lastPt = target.pathHistory[target.pathHistory.length - 1];
      if (!lastPt || Math.abs(lastPt[0] - lat) > 0.00005 || Math.abs(lastPt[1] - lng) > 0.00005) {
        target.pathHistory.push(newPoint);
      }
    } else {
      target = {
        id: `lp_${Date.now()}`,
        vehicleId: data.vehicleId || `v_${Date.now()}`,
        vehicleReg,
        driverName: data.driverName || 'Driver',
        lat,
        lng,
        speed,
        heading,
        source: 'browser',
        timestamp: new Date().toISOString(),
        pathHistory: [newPoint]
      };
      db.livePositions.unshift(target);
    }

    // Also append to ongoing trip pathHistory
    const ongoingTrip = db.trips.find(t => t.vehicleId === vehicleReg && t.status === 'ongoing');
    if (ongoingTrip) {
      if (!ongoingTrip.pathHistory) ongoingTrip.pathHistory = [];
      const lastTripPt = ongoingTrip.pathHistory[ongoingTrip.pathHistory.length - 1];
      if (!lastTripPt || Math.abs(lastTripPt[0] - lat) > 0.00005 || Math.abs(lastTripPt[1] - lng) > 0.00005) {
        ongoingTrip.pathHistory.push(newPoint);
      }
    }

    saveDB();
    return HttpResponse.json({ success: true, position: target });
  }),

  // Live Tracking: Returns real registered vehicles only
  http.get('/tracking/live', () => {
    reloadDB();
    return HttpResponse.json({ results: db.livePositions || [] });
  }),

  // Expenses
  http.get('/expenses', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const approved = url.searchParams.get('approved');
    let results = [...db.expenses];
    if (category && category !== 'all') {
      results = results.filter(e => e.category === category);
    }
    if (approved && approved !== 'all') {
      results = results.filter(e => e.approved === approved);
    }
    return HttpResponse.json({ results, count: results.length });
  }),

  http.post('/expenses', async ({ request }) => {
    const data = await request.json() as Partial<Expense>;
    const newExpense: Expense = {
      id: `e${Date.now()}`,
      vehicleId: data.vehicleId || 'MH 12 AB 1234',
      driverId: data.driverId || 'Ramesh Kumar',
      category: data.category || 'fuel',
      amount: Number(data.amount) || 500,
      date: data.date || new Date().toISOString().split('T')[0],
      notes: data.notes || '',
      receiptPhotoUrl: data.receiptPhotoUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=60',
      approved: 'pending'
    };
    db.expenses.unshift(newExpense);
    saveDB();
    return HttpResponse.json(newExpense, { status: 201 });
  }),

  http.put('/expenses/:id/approve', ({ params }) => {
    const exp = db.expenses.find(e => e.id === params.id);
    if (exp) {
      exp.approved = 'approved';
      exp.approvedBy = 'Tarun (Owner)';
    }
    saveDB();
    return HttpResponse.json({ success: true, expense: exp });
  }),

  http.put('/expenses/:id/reject', ({ params }) => {
    const exp = db.expenses.find(e => e.id === params.id);
    if (exp) {
      exp.approved = 'rejected';
      exp.approvedBy = 'Tarun (Owner)';
    }
    saveDB();
    return HttpResponse.json({ success: true, expense: exp });
  }),

  // Analytics
  http.get('/analytics/summary', () => {
    const totalVehicles = db.vehicles.length;
    const activeTrips = db.trips.filter(t => t.status === 'ongoing').length;
    const pendingDocs = db.documents.filter(d => {
      const days = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;
    const totalExpense = db.expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return HttpResponse.json({
      totalVehicles,
      activeTrips,
      pendingDocs,
      totalExpense,
      currency: '₹'
    });
  }),

  // Notifications
  http.get('/notifications', () => {
    return HttpResponse.json({ results: db.notifications, count: db.notifications.length });
  }),

  http.put('/notifications/:id/read', ({ params }) => {
    const n = db.notifications.find(item => item.id === params.id);
    if (n) n.read = true;
    saveDB();
    return HttpResponse.json({ success: true });
  }),

  http.put('/notifications/read-all', () => {
    db.notifications.forEach(n => n.read = true);
    saveDB();
    return HttpResponse.json({ success: true });
  }),

  // Maintenance
  http.get('/maintenance', () => {
    return HttpResponse.json({ results: db.maintenance, count: db.maintenance.length });
  }),

  http.post('/maintenance', async ({ request }) => {
    const data = await request.json() as Partial<MaintenanceRecord>;
    const record: MaintenanceRecord = {
      id: `m${Date.now()}`,
      vehicleId: data.vehicleId || 'MH 12 AB 1234',
      title: data.title || 'Routine Maintenance',
      description: data.description || '',
      scheduledDate: data.scheduledDate || new Date().toISOString().split('T')[0],
      status: data.status || 'scheduled',
      cost: Number(data.cost) || 0,
      odometerReading: data.odometerReading
    };
    db.maintenance.unshift(record);
    saveDB();
    return HttpResponse.json(record, { status: 201 });
  })
];
