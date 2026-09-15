export type Role = 'owner' | 'manager' | 'driver';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  fleetId: string;
  profilePhotoUrl?: string;
  createdAt: string;        // ISO 8601
  assignedVehicleId?: string;
  assignedVehicleReg?: string;
  assignedRoute?: string;
}

export interface Fleet {
  id: string;
  name: string;
  logoUrl?: string;
  ownerId: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  fleetId: string;
  registrationNumber: string;      // unique within the fleet
  type: 'truck' | 'van' | 'car' | 'bike' | 'bus';
  make: string;
  model: string;
  year: number;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid';
  odometerReading: number;         // km
  assignedDriverId?: string;
  status: 'active' | 'inService' | 'idle' | 'maintenance';
  trackerDeviceId?: string;
  photoUrl?: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  licenseNumber: string;
  licenseExpiry: string;
  licensePhotoUrl?: string;
  idProofUrl?: string;
  joiningDate: string;
  assignedVehicleId?: string;
  assignedVehicleReg?: string;
  assignedRoute?: string;
  status: 'active' | 'suspended';
}

export interface DocumentItem {
  id: string;
  ownerType: 'vehicle' | 'driver';
  ownerId: string;
  ownerName?: string;
  docType: 'license' | 'rc' | 'insurance' | 'permit' | 'puc' | 'fitness' | 'idProof';
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
  verified: boolean;
  uploadedAt: string;
}

export interface Trip {
  id: string;
  vehicleId: string;
  driverId: string;
  startTime: string;
  endTime?: string;
  startLat: number;
  startLng: number;
  endLat?: number;
  endLng?: number;
  routePolyline?: string;          // encoded polyline or json
  pathHistory?: [number, number][];
  distanceKm?: number;
  status: 'ongoing' | 'completed';
  notes?: string;
}

export interface LocationPing {
  id: string;
  tripId?: string;
  vehicleId: string;
  vehicleReg?: string;
  driverName?: string;
  lat: number;
  lng: number;
  speed: number;                   // km/h
  heading: number;                 // degrees, 0 = north
  source: 'browser' | 'device';
  timestamp: string;
  pathHistory?: [number, number][];
}

export interface Expense {
  id: string;
  vehicleId: string;
  driverId: string;
  category: 'fuel' | 'toll' | 'maintenance' | 'repair' | 'fine' | 'other';
  amount: number;
  date: string;
  receiptPhotoUrl?: string;
  odometerAtEntry?: number;
  notes?: string;
  approved: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'docExpiry' | 'maintenanceDue' | 'tripAlert' | 'expenseSubmitted' | 'driverInvited';
  message: string;
  linkTo?: string;
  read: boolean;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  title: string;
  description: string;
  scheduledDate: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  cost?: number;
  odometerReading?: number;
}
