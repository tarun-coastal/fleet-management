import type { Vehicle, DriverProfile, Trip, Expense, DocumentItem, AppNotification, LocationPing, MaintenanceRecord, User } from '@/types';

const STORAGE_KEY = 'fleet_db_v4_clean';

export interface DatabaseSchema {
  users: Array<User & { password?: string }>;
  vehicles: Vehicle[];
  drivers: DriverProfile[];
  documents: DocumentItem[];
  trips: Trip[];
  livePositions: LocationPing[];
  expenses: Expense[];
  notifications: AppNotification[];
  maintenance: MaintenanceRecord[];
}

// Clean starting state - No fake vehicles, drivers, trips, or expenses!
const initialData: DatabaseSchema = {
  users: [
    {
      id: '1',
      name: 'Fleet Owner',
      email: 'owner@test.com',
      password: 'password',
      role: 'owner',
      fleetId: 'f1',
      phone: '+91 98765 00000',
      createdAt: new Date().toISOString()
    },
    {
      id: '5',
      name: 'Operations Manager',
      email: 'manager@test.com',
      password: 'password',
      role: 'manager',
      fleetId: 'f1',
      phone: '+91 98765 11111',
      createdAt: new Date().toISOString()
    }
  ],
  vehicles: [],
  drivers: [],
  documents: [],
  trips: [],
  livePositions: [],
  expenses: [],
  notifications: [],
  maintenance: []
};

function loadDB(): DatabaseSchema {
  try {
    // Clear old versions with mock data
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('fleet_db_v1');
      localStorage.removeItem('fleet_db_v2');
      localStorage.removeItem('fleet_db_v3');
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { 
        ...initialData, 
        ...parsed, 
        users: (parsed.users && parsed.users.length > 0) ? parsed.users : initialData.users 
      };
    }
  } catch (e) {
    // ignore
  }
  return initialData;
}

export const db: DatabaseSchema = loadDB();

export function reloadDB(): DatabaseSchema {
  const fresh = loadDB();
  Object.assign(db, fresh);
  return db;
}

export function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    // ignore
  }
}

export function resetDB() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('fleet_active_driver_trip');
    Object.assign(db, initialData);
    saveDB();
  } catch (e) {
    // ignore
  }
}
