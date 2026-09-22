import { useQuery } from '@tanstack/react-query';
import { getAnalyticsSummary, getTrips, getDocuments, getLivePositions } from '@/lib/supabaseApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Truck, Navigation, AlertTriangle, IndianRupee, ArrowUpRight, CheckCircle2, MapPin, Clock } from 'lucide-react';

export function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => getAnalyticsSummary()
  });

  const { data: trips } = useQuery({
    queryKey: ['trips'],
    queryFn: () => getTrips()
  });

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: () => getDocuments()
  });

  const { data: trackingLive } = useQuery({
    queryKey: ['tracking-live'],
    queryFn: () => getLivePositions(),
    refetchInterval: 4000
  });

  const liveUnits = trackingLive || [];
  const movingUnits = liveUnits.filter((u: any) => u.speed > 5);

  const expiredDocs = documents?.filter((d: any) => {
    const days = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days < 0;
  }) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Fleet Operations Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time status overview of vehicles, live journeys, compliance and costs</p>
        </div>
        <div className="flex gap-2">
          <Link to="/tracking">
            <Button className="bg-blue-600 hover:bg-blue-700 text-xs md:text-sm">
              <MapPin className="w-4 h-4 mr-1.5" /> Live Tracking Map
            </Button>
          </Link>
          <Link to="/vehicles">
            <Button variant="outline" className="text-xs md:text-sm">Manage Vehicles</Button>
          </Link>
        </div>
      </div>

      {/* Critical Alert Strip only if docs actually expired */}
      {expiredDocs.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Action Required: {expiredDocs.length} statutory document(s) expired!
              </p>
              <p className="text-xs text-red-700">
                Vehicles with expired permits or fitness certificates risk checkpoint fines.
              </p>
            </div>
          </div>
          <Link to="/documents">
            <Button size="sm" variant="destructive">Review Vault</Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Vehicles</CardTitle>
            <Truck className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : (summary?.totalVehicles ?? 0)}</div>
            <p className="text-xs text-slate-400 mt-1">Registered in your fleet</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Trips Ongoing</CardTitle>
            <Navigation className="w-4 h-4 text-emerald-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : (summary?.activeTrips ?? 0)}</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {movingUnits.length} vehicle(s) moving live
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Docs Needing Attention</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{isLoading ? '...' : (summary?.pendingDocs ?? 0)}</div>
            <p className="text-xs text-slate-400 mt-1">Expiring within 30 days</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fleet Expense</CardTitle>
            <IndianRupee className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{isLoading ? '...' : (summary?.totalExpense ?? 0).toLocaleString('en-IN')}</div>
            <p className="text-xs text-slate-400 mt-1">Logged expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Mid section: Quick Map & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Map Preview Card */}
        <Card className="lg:col-span-2 shadow-xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Live Fleet Radar Overview</CardTitle>
              <p className="text-xs text-slate-500">Real-time GPS positioning of commercial dispatches</p>
            </div>
            <Link to="/tracking">
              <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-800 text-xs">
                Expand Full Radar <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex-1 min-h-[240px] bg-slate-100 rounded-b-lg flex flex-col items-center justify-center relative overflow-hidden border m-4 mt-0">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="z-10 text-center p-6 space-y-3">
              <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full text-blue-600 mb-1">
                <MapPin className="w-7 h-7 animate-bounce" />
              </div>
              {liveUnits.length > 0 ? (
                <>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {liveUnits.length} Vehicle(s) Connected ({movingUnits.length} On Live Transit)
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {liveUnits.map((u: any) => `${u.vehicleReg} (${u.speed} km/h)`).join(' • ')}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-bold text-slate-800 text-sm">No Vehicles on Radar</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Register a vehicle to begin streaming live coordinates and tracking transit routes.
                  </p>
                </>
              )}
              <Link to="/tracking">
                <Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700 text-xs">Open Live Map & Route Path</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Log */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Fleet Activity</CardTitle>
            <p className="text-xs text-slate-500">Live trip dispatches & updates</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!trips || trips.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Clock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                No trip activity yet. Dispatches will show here automatically.
              </div>
            ) : (
              trips.slice(0, 4).map((t: any) => (
                <div key={t.id} className="flex items-start gap-3 text-sm">
                  <div className={`p-1.5 rounded-full mt-0.5 ${t.status === 'ongoing' ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-slate-800">
                      {t.status === 'ongoing' ? 'Trip Ongoing: ' : 'Trip Completed: '}
                      {t.vehicleId}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Driver: {t.driverId} {t.distanceKm ? `• ${t.distanceKm} km` : ''}
                    </p>
                    <span className="text-[10px] text-slate-400">{new Date(t.startTime).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
