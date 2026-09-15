import { useState, useEffect, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import type { LocationPing } from '@/types';
import { Button } from '@/components/ui/button';
import { Navigation, Gauge, RefreshCw, Clock, Play, MapPin, Truck, AlertCircle, Compass, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// Custom SVG vehicle marker with rotation (Point B / Current Position)
function createVehicleIcon(speed: number, heading: number = 0, isSelected: boolean = false) {
  const isMoving = speed > 2;
  const bgColor = isMoving ? '#10b981' : '#64748b'; // Emerald if moving, Slate/Gray if stationary
  const border = isSelected ? '3px solid #2563eb' : '2px solid white';
  const scale = isSelected ? 'scale(1.15)' : 'scale(1)';

  return L.divIcon({
    className: 'custom-vehicle-div-icon',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 38px;
        height: 38px;
        border-radius: 50%;
        border: ${border};
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transform: ${scale};
        transition: all 0.25s ease;
        position: relative;
      ">
        ${isMoving ? `
          <div style="transform: rotate(${heading}deg); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1">
              <polygon points="12 2 19 21 12 17 5 21 12 2"/>
            </svg>
          </div>
          <span style="
            position: absolute;
            bottom: -15px;
            background: #0f172a;
            color: #4ade80;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid #10b981;
          ">${speed} km/h</span>
        ` : `
          <div style="display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
          <span style="
            position: absolute;
            bottom: -15px;
            background: #1e293b;
            color: #cbd5e1;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 4px;
            white-space: nowrap;
          ">0 km/h</span>
        `}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22]
  });
}

// Point A marker (Start of the dispatch journey)
function createPointAIcon() {
  return L.divIcon({
    className: 'point-a-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, #15803d, #16a34a);
        color: white;
        font-weight: 900;
        font-size: 13px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2.5px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, sans-serif;
        position: relative;
      ">
        A
        <span style="
          position: absolute;
          bottom: -15px;
          background: #14532d;
          color: #86efac;
          font-size: 8px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 4px;
          white-space: nowrap;
          border: 1px solid #16a34a;
        ">START</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20]
  });
}

// Leaflet resizer to handle initial layout and render tiles correctly
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Auto-pan helper when vehicle is selected
function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 13, { duration: 1.2 });
  }, [position, map]);
  return null;
}

export function TrackingPage() {
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<LocationPing | null>(null);

  // Poll live tracking every 3 seconds for continuous telemetry sync
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['tracking-live'],
    queryFn: async () => {
      const res = await api.get('/tracking/live');
      return (res.data?.results ?? []) as LocationPing[];
    },
    refetchInterval: 3000,
  });

  // Cross-tab real-time sync: when driver pings in another tab, immediately update owner radar!
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'fleet_db_v4_clean' || e.key === 'fleet_active_driver_trip') {
        refetch();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refetch]);

  const vehicles = data || [];

  // Manual GPS step simulation for selected vehicle
  const handleSimulateStep = () => {
    if (vehicles.length === 0) {
      toast.info('No vehicles added yet! Register a vehicle in Vehicles tab first.');
      return;
    }

    const target = selectedVehicle || vehicles[0];
    const newLat = target.lat + 0.003;
    const newLng = target.lng + 0.003;

    api.post('/tracking/ping', {
      vehicleReg: target.vehicleReg,
      driverName: target.driverName,
      lat: newLat,
      lng: newLng,
      speed: 42,
      heading: 90
    }).then(() => {
      refetch();
      toast.success(`Position updated! Journey path extended for ${target.vehicleReg}`);
      setTimeout(() => {
        api.post('/tracking/ping', {
          vehicleReg: target.vehicleReg,
          driverName: target.driverName,
          lat: newLat,
          lng: newLng,
          speed: 0,
          heading: 90
        }).then(() => refetch());
      }, 2500);
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-slate-100">
      {/* Top Bar */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 z-10 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
              Live Fleet Tracking & Route Radar
            </h1>
            <p className="text-xs text-slate-500">
              Highlighted dispatch path from Point A to Point B • Real-time GPS stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {vehicles.length > 0 && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={handleSimulateStep}
            >
              <Play className="w-3.5 h-3.5 mr-1 text-blue-600" /> Simulate Move Forward
            </Button>
          )}

          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs h-8"
            onClick={() => refetch()} 
            disabled={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Pinging...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Main Split View: Map + Units Side Panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Leaflet Map */}
        <div className="flex-1 h-[55vh] md:h-full relative min-h-[350px] bg-slate-200">
          <MapContainer 
            center={vehicles[0] ? [vehicles[0].lat, vehicles[0].lng] : [20.5937, 78.9629]} 
            zoom={vehicles[0] ? 12 : 5} 
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', minHeight: '350px' }}
          >
            <MapResizer />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Render Journey Path from Point A to Point B */}
            {vehicles.map((v) => {
              const recordedPath = v.pathHistory || [];
              const fullPath: [number, number][] = [...recordedPath];
              if (fullPath.length === 0 || (Math.abs(fullPath[fullPath.length - 1][0] - v.lat) > 0.0001 || Math.abs(fullPath[fullPath.length - 1][1] - v.lng) > 0.0001)) {
                fullPath.push([v.lat, v.lng]);
              }
              const hasJourney = fullPath.length >= 2;
              const startPoint = fullPath[0];

              return (
                <Fragment key={v.id}>
                  {/* Outer Glow Highlighted Polyline Casing */}
                  {hasJourney && (
                    <Polyline 
                      positions={fullPath} 
                      pathOptions={{
                        color: '#60a5fa', 
                        weight: 10, 
                        opacity: 0.45, 
                        lineCap: 'round',
                        lineJoin: 'round'
                      }}
                    />
                  )}

                  {/* Inner Vibrant Highlighted Route Line */}
                  {hasJourney && (
                    <Polyline 
                      positions={fullPath} 
                      pathOptions={{
                        color: '#2563eb', 
                        weight: 5, 
                        opacity: 0.95, 
                        lineCap: 'round',
                        lineJoin: 'round'
                      }}
                    />
                  )}

                  {/* Point A Marker (Trip Starting Origin) */}
                  {hasJourney && startPoint && (
                    <Marker 
                      position={startPoint} 
                      icon={createPointAIcon()}
                    >
                      <Popup>
                        <div className="p-1 text-xs">
                          <span className="font-bold text-emerald-700 block text-sm">📍 Point A — Starting Point</span>
                          <span className="text-slate-500 font-mono">Coords: {startPoint[0].toFixed(5)}, {startPoint[1].toFixed(5)}</span>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Current Position Marker (Point B / Vehicle) */}
                  <Marker 
                    position={[v.lat, v.lng]} 
                    icon={createVehicleIcon(v.speed, v.heading, selectedVehicle?.id === v.id)}
                    eventHandlers={{
                      click: () => setSelectedVehicle(v)
                    }}
                  >
                    <Popup>
                      <div className="p-1.5 space-y-1 text-xs">
                        <div className="font-bold text-sm text-slate-900 flex items-center justify-between">
                          <span>{v.vehicleReg || 'Vehicle'}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${v.speed > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {v.speed > 2 ? `${v.speed} km/h` : '0 km/h (Stationary)'}
                          </span>
                        </div>
                        <div className="text-slate-600">Driver: <strong>{v.driverName}</strong></div>
                        <div className="text-blue-600 font-mono">Point B (Current): {v.lat.toFixed(5)}, {v.lng.toFixed(5)}</div>
                        {hasJourney && (
                          <div className="text-[10px] text-blue-700 font-semibold bg-blue-50 p-1 rounded border border-blue-100">
                            Path Highlighted: {fullPath.length} recorded waypoints from Point A
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </Fragment>
              );
            })}

            {selectedVehicle && (
              <RecenterMap position={[selectedVehicle.lat, selectedVehicle.lng]} />
            )}
          </MapContainer>

          {/* Empty State Banner if no vehicles exist */}
          {vehicles.length === 0 && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[999]">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md text-center space-y-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Your Fleet Radar is Ready</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  All demo mock data has been cleared. Add your first vehicle and assign a driver to watch real GPS tracking and journey paths.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Link to="/vehicles">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs">
                      + Add Vehicle
                    </Button>
                  </Link>
                  <Link to="/drivers">
                    <Button size="sm" variant="outline" className="text-xs">
                      + Add Driver
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Selected Vehicle Float Overlay Card */}
          {selectedVehicle && (
            <div className="absolute top-4 left-4 right-4 md:right-auto md:w-88 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-slate-200 z-[1000] animate-in fade-in">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    GPS
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{selectedVehicle.vehicleReg}</h3>
                    <p className="text-xs text-slate-500">Driver: {selectedVehicle.driverName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedVehicle(null)} 
                  className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                <div className="p-2 bg-slate-50 rounded-md">
                  <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-emerald-500" /> Speed
                  </span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedVehicle.speed > 2 ? `${selectedVehicle.speed} km/h` : '0 km/h (Stationary)'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-md">
                  <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                    <Compass className="w-3 h-3 text-blue-500" /> Trail Points
                  </span>
                  <span className="font-bold text-slate-800 text-sm">{selectedVehicle.pathHistory?.length || 1} logged</span>
                </div>
              </div>

              <div className="mt-2 text-[11px] bg-blue-50 text-blue-800 p-2 rounded-md font-medium flex items-center justify-between">
                <span>📍 Point A: Journey Start</span>
                <span>➔</span>
                <span>📍 Point B: Current Live</span>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Fleet Units Radar */}
        <aside className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-[45vh] md:h-full z-10">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-800">Tracked Units ({vehicles.length})</h2>
              <p className="text-[11px] text-slate-400">Click any unit to highlight journey</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Moving
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Idle
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {vehicles.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No vehicles registered. Add a vehicle to see it on the map.
              </div>
            ) : (
              vehicles.map((v) => {
                const isMoving = v.speed > 2;
                const isSelected = selectedVehicle?.id === v.id;
                const hasPath = (v.pathHistory?.length || 0) >= 2;

                return (
                  <div 
                    key={v.id} 
                    onClick={() => {
                      setSelectedVehicle(v);
                      toast.info(`Focused on ${v.vehicleReg}`);
                    }}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-50/80 border-l-4 border-l-blue-600' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isMoving ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                        <span className="font-bold text-sm text-slate-900">{v.vehicleReg || v.vehicleId}</span>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isMoving ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isMoving ? `${v.speed} km/h` : '0 km/h'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 pl-4.5">
                      <p className="text-xs text-slate-700 font-medium">{v.driverName}</p>
                      {hasPath && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                          Path A ➔ B Active
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1.5 pl-4.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 font-mono">
                        <MapPin className="w-3 h-3 text-blue-500" /> {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
                      </span>
                      <span className="capitalize text-slate-500">{v.source}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}