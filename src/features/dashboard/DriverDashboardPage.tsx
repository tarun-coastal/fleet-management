import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, MapPin, Plus, AlertCircle, ShieldCheck, Gauge, Clock, Radio, ExternalLink, Navigation, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { pingTracking, startTrip, endTrip, getVehicles } from '@/lib/supabaseApi';

const ACTIVE_TRIP_STORAGE_KEY = 'fleet_active_driver_trip';

interface ActiveTripState {
  tripId: string;
  vehicleReg: string;
  driverName: string;
  assignedRoute?: string;
  startTime: string;
  lat: number;
  lng: number;
  pingsSent: number;
  distanceKm: number;
}

export function DriverDashboardPage() {
  const user = useAuthStore(s => s.user);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => getVehicles()
  });

  const driverName = user?.name || 'Driver';
  const driverVehicle = user?.assignedVehicleReg || vehicles[0]?.registrationNumber || 'No Vehicle Assigned';
  const driverRoute = user?.assignedRoute || 'Assigned Transit Route';

  const [activeTrip, setActiveTrip] = useState<ActiveTripState | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_TRIP_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [tripSeconds, setTripSeconds] = useState<number>(0);
  const isTripActive = !!activeTrip;
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [isCruising, setIsCruising] = useState<boolean>(false);
  const speedTimeoutRef = useRef<any>(null);

  // Sync timer from original start time
  useEffect(() => {
    if (activeTrip) {
      const startMs = new Date(activeTrip.startTime).getTime();
      const initialSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setTripSeconds(initialSeconds);

      const timer = setInterval(() => {
        setTripSeconds(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setTripSeconds(0);
      setCurrentSpeed(0);
      setIsCruising(false);
    }
  }, [activeTrip?.tripId]);

  // Telemetry Loop: Only advances when isCruising is explicitly ON!
  useEffect(() => {
    if (!activeTrip) return;

    if (isCruising) {
      setCurrentSpeed(42);
      const cruiseTimer = setInterval(async () => {
        const nextLat = +(activeTrip.lat + 0.0015).toFixed(5);
        const nextLng = +(activeTrip.lng + 0.0015).toFixed(5);
        const nextDist = +(activeTrip.distanceKm + 0.15).toFixed(2);
        const nextPings = activeTrip.pingsSent + 1;

        const updatedTrip: ActiveTripState = {
          ...activeTrip,
          lat: nextLat,
          lng: nextLng,
          distanceKm: nextDist,
          pingsSent: nextPings
        };

        try {
          await pingTracking({
            vehicleReg: activeTrip.vehicleReg,
            driverName: activeTrip.driverName,
            lat: nextLat,
            lng: nextLng,
            speed: 42,
            heading: 90
          });
          setActiveTrip(updatedTrip);
          localStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(updatedTrip));
        } catch (e) {
          // ignore
        }
      }, 4000);
      return () => clearInterval(cruiseTimer);
    } else {
      // Stationary: Send heartbeat every 8s with STRICT 0 km/h speed and NO coordinate change
      setCurrentSpeed(0);
      const stationaryHeartbeat = setInterval(() => {
        pingTracking({
          vehicleReg: activeTrip.vehicleReg,
          driverName: activeTrip.driverName,
          lat: activeTrip.lat,
          lng: activeTrip.lng,
          speed: 0,
          heading: 90
        }).catch(() => {});
      }, 8000);
      return () => clearInterval(stationaryHeartbeat);
    }
  }, [activeTrip?.tripId, isCruising, activeTrip?.lat, activeTrip?.lng]);

  const handleDriveStep = async () => {
    if (!activeTrip) return;
    const nextLat = +(activeTrip.lat + 0.002).toFixed(5);
    const nextLng = +(activeTrip.lng + 0.002).toFixed(5);
    const nextDist = +(activeTrip.distanceKm + 0.25).toFixed(2);
    const nextPings = activeTrip.pingsSent + 1;

    setCurrentSpeed(45);
    if (speedTimeoutRef.current) clearTimeout(speedTimeoutRef.current);

    try {
      await pingTracking({
        vehicleReg: activeTrip.vehicleReg,
        driverName: activeTrip.driverName,
        lat: nextLat,
        lng: nextLng,
        speed: 45,
        heading: 90
      });

      const updated = {
        ...activeTrip,
        lat: nextLat,
        lng: nextLng,
        distanceKm: nextDist,
        pingsSent: nextPings
      };
      setActiveTrip(updated);
      localStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(updated));
      toast.success('Vehicle moved! Path A ➔ B extending on map.');

      // Settle speed back to 0 km/h once movement step is completed
      speedTimeoutRef.current = setTimeout(async () => {
        setCurrentSpeed(0);
        await pingTracking({
          vehicleReg: activeTrip.vehicleReg,
          driverName: activeTrip.driverName,
          lat: nextLat,
          lng: nextLng,
          speed: 0,
          heading: 90
        }).catch(() => {});
      }, 2500);
    } catch (e) {
      toast.error('Failed to update position');
    }
  };

  const handleStartTrip = async () => {
    const defaultCoords = { lat: 18.5204, lng: 73.8567 };

    const initializeTrip = async (lat: number, lng: number) => {
      try {
        const resTrip = await startTrip({
          vehicleReg: driverVehicle,
          driverName,
          lat,
          lng,
          notes: `Dispatch run: ${driverRoute}`
        });

        const newActive: ActiveTripState = {
          tripId: resTrip.id,
          vehicleReg: driverVehicle,
          driverName,
          assignedRoute: driverRoute,
          startTime: new Date().toISOString(),
          lat,
          lng,
          pingsSent: 1,
          distanceKm: 0
        };

        setCurrentSpeed(0);
        setIsCruising(false);
        setActiveTrip(newActive);
        localStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(newActive));
        toast.success(`Trip started at Point A! Vehicle stationary (0 km/h).`);
      } catch (e) {
        toast.error('Failed to start trip');
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => initializeTrip(pos.coords.latitude, pos.coords.longitude),
        () => initializeTrip(defaultCoords.lat, defaultCoords.lng)
      );
    } else {
      initializeTrip(defaultCoords.lat, defaultCoords.lng);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;

    try {
      await endTrip(activeTrip.tripId, {
        lat: activeTrip.lat,
        lng: activeTrip.lng,
        distanceKm: Math.max(activeTrip.distanceKm, 2.5)
      });
      toast.info(`Trip ended! ${Math.max(activeTrip.distanceKm, 2.5)} km logged.`);
    } catch (e) {
      // ignore
    }

    localStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
    setActiveTrip(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Driver Console</h1>
          <p className="text-xs text-slate-500">Welcome, <span className="font-semibold text-slate-700">{driverName}</span></p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
          isTripActive ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-slate-100 text-slate-600'
        }`}>
          {isTripActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>}
          {isTripActive ? 'ON TRIP' : 'IDLE'}
        </span>
      </div>

      {/* Assigned Vehicle & Assigned Route Card */}
      <Card className="shadow-xs border-l-4 border-l-blue-600">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Commercial Unit</span>
                <h2 className="font-bold text-base text-slate-900">{driverVehicle}</h2>
              </div>
            </div>
          </div>

          {/* Assigned Transit Route Banner */}
          <div className="mt-3 p-2.5 bg-blue-50/70 rounded-lg border border-blue-100 flex items-start gap-2">
            <Compass className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">Assigned Dispatch Route</span>
              <p className="text-xs text-blue-950 font-medium leading-snug">{driverRoute}</p>
            </div>
          </div>

          {/* Statutory Compliance Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-1.5 bg-emerald-50 rounded text-emerald-700 font-medium flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> RC Valid
            </div>
            <div className="p-1.5 bg-amber-50 rounded text-amber-700 font-medium flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Insur. (15d)
            </div>
            <div className="p-1.5 bg-emerald-50 rounded text-emerald-700 font-medium flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> PUC Valid
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Trip Control Card */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isTripActive ? 'Live Route Dispatch in Progress' : 'Ready for Transit Dispatch'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 pt-2">
          {isTripActive ? (
            <div className="w-full space-y-3">
              {/* Big Stopwatch Timer */}
              <div className="text-center">
                <div className="text-4xl font-extrabold tracking-tight text-blue-600 font-mono">
                  {formatTimer(tripSeconds)}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Elapsed Trip Duration</p>
              </div>

              {/* Live Telemetry Box */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Radio className={`w-4 h-4 ${currentSpeed > 0 ? 'animate-pulse text-emerald-600' : 'text-slate-400'}`} />
                    Status: {currentSpeed > 0 ? (
                      <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                        Moving ({currentSpeed} km/h)
                      </span>
                    ) : (
                      <span className="text-slate-700 font-bold bg-slate-200 px-2 py-0.5 rounded-full text-[11px]">
                        Stationary (0 km/h)
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full font-mono text-slate-500 border">
                    {activeTrip.pingsSent} points logged
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Gauge className={`w-3.5 h-3.5 ${currentSpeed > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <span>Speed: <strong className={currentSpeed > 0 ? 'text-emerald-600 font-mono text-sm' : 'text-slate-700 font-mono text-sm'}>{currentSpeed} km/h</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                    <span>Distance: <strong>{activeTrip.distanceKm} km</strong></span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono bg-white p-1.5 rounded border flex justify-between">
                  <span>Point B: {activeTrip.lat.toFixed(5)}, {activeTrip.lng.toFixed(5)}</span>
                  <span className="font-semibold text-blue-600">{activeTrip.vehicleReg}</span>
                </div>

                {/* Driver Movement Controls */}
                <div className="flex gap-2 pt-1">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold h-9"
                    onClick={handleDriveStep}
                  >
                    🚗 Drive Forward (+200m)
                  </Button>

                  <Button 
                    type="button"
                    variant={isCruising ? "default" : "outline"}
                    size="sm" 
                    className={`text-xs font-semibold h-9 ${isCruising ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                    onClick={() => {
                      const nextCruise = !isCruising;
                      setIsCruising(nextCruise);
                      if (nextCruise) {
                        toast.success('Auto-Cruising active (~42 km/h). Route highlighting on radar!');
                      } else {
                        toast.info('Vehicle stopped. Speed is now 0 km/h (Stationary).');
                      }
                    }}
                  >
                    {isCruising ? '⏸️ Park / Stop' : '⚡ Auto-Cruise'}
                  </Button>
                </div>
              </div>

              {/* Direct Link to Owner Radar for Testing */}
              <div className="text-center pt-1">
                <Link 
                  to="/tracking" 
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <MapPin className="w-3.5 h-3.5" /> View live path on Radar Map <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-slate-500 text-xs space-y-1">
              <p className="font-medium text-slate-700">Vehicle: {driverVehicle}</p>
              <p className="text-[11px] text-slate-400">Route: {driverRoute}</p>
              <p className="text-[11px] text-slate-400 pt-1">Tap below to capture starting coordinates & stream live GPS to owner.</p>
            </div>
          )}

          <Button 
            size="lg" 
            className={`w-full text-base h-14 font-bold shadow-md transition-all ${
              isTripActive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            onClick={isTripActive ? handleEndTrip : handleStartTrip}
          >
            {isTripActive ? 'FINISH & END TRIP' : 'START TRIP NOW'}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Link to="/driver/expenses">
          <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-2 border-slate-300">
            <Plus className="w-4 h-4 text-purple-600" /> Add Fuel Receipt
          </Button>
        </Link>
        <Link to="/driver/trips">
          <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-2 border-slate-300">
            <Clock className="w-4 h-4 text-blue-600" /> My Trip Logs
          </Button>
        </Link>
      </div>
    </div>
  );
}
