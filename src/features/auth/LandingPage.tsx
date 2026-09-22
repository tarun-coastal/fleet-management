import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FleetHighway3D } from '../landing/FleetHighway3D';
import { useAuthStore } from '@/lib/store';
import { 
  Truck, Navigation, ShieldCheck, FileText, Activity, IndianRupee, 
  MapPin, CheckCircle2, ArrowRight, Zap, Play, Compass, KeyRound, Sparkles, UserCheck 
} from 'lucide-react';
import { toast } from 'sonner';

export function LandingPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const [simState, setSimState] = useState({
    activeUnits: 4,
    totalDistance: 1420,
    speed: 68,
    status: 'All 4 Vehicles Operational'
  });

  const handle1ClickLogin = (role: 'owner' | 'driver') => {
    if (role === 'owner') {
      useAuthStore.getState().setAuth('owner-jwt-demo', {
        id: 'u_owner',
        name: 'Tarun (Owner)',
        email: 'owner@test.com',
        phone: '+91 98765 00000',
        role: 'owner',
        fleetId: 'f1',
        createdAt: new Date().toISOString()
      });
      navigate('/dashboard');
      toast.success('Signed in as Fleet Owner');
    } else {
      useAuthStore.getState().setAuth('driver-jwt-demo', {
        id: 'd_demo',
        name: 'Sai Ram (Driver)',
        email: 'sai@mail.com',
        phone: '+91 98765 43210',
        role: 'driver',
        fleetId: 'f1',
        createdAt: new Date().toISOString(),
        assignedVehicleReg: 'AP079BC1290',
        assignedRoute: 'Highway Express Corridor'
      });
      navigate('/driver');
      toast.success('Signed in as Driver');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20">
              FL
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-2">
                FLEET CONTROL <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono">3D v2.0</span>
              </span>
              <p className="text-[11px] text-slate-400">Supabase Connected Transport Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => handle1ClickLogin('driver')}
              className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs hidden sm:flex"
            >
              Driver Console
            </Button>
            <Link to="/login">
              <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs">
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30">
                Create Owner Account
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main 3D Hero Section */}
      <section className="relative pt-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12">
        {/* Hero Text Content */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive 3D WebGL Telemetry Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Real-Time 3D Fleet <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
              Transport Control
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Monitor commercial haulers on interactive 3D highways, track GPS telemetry, manage statutory document vaults (RC & Insurance), approve fuel claims, and dispatch drivers seamlessly with Supabase.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <Button 
              size="lg" 
              onClick={() => handle1ClickLogin('owner')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 h-12 shadow-xl shadow-blue-600/30 flex items-center gap-2 group"
            >
              <span>Launch Owner Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              onClick={() => handle1ClickLogin('driver')}
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm h-12 px-5 flex items-center gap-2"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Driver Mobile Console</span>
            </Button>
          </div>

          {/* Quick Demo Test Bar */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              1-Click Demo Evaluation:
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => handle1ClickLogin('owner')}
                className="px-2.5 py-1 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/50 rounded font-medium transition-colors"
              >
                Try as Owner
              </button>
              <button 
                onClick={() => handle1ClickLogin('driver')}
                className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/50 rounded font-medium transition-colors"
              >
                Try as Driver
              </button>
            </div>
          </div>
        </div>

        {/* 3D WebGL Interactive Canvas Viewport */}
        <div className="flex-1 w-full max-w-2xl">
          <FleetHighway3D />
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="py-16 bg-slate-900/50 border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Complete Transport Ecosystem</h2>
            <p className="text-slate-400 text-sm">
              Built for commercial transport companies, fleet managers, and long-haul logistics drivers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-900 border-slate-800 text-slate-200 hover:border-blue-500/50 transition-colors">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Navigation className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-white">Live Radar & GPS</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time telemetry tracking with interactive Leaflet maps and 3D highway simulation.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-white">Doc Vault & Verification</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload, view, and renew RC, Insurance, PUC, and Commercial Permits with expiry alerts.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/50 transition-colors">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-white">Fuel & Toll Expenses</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Drivers submit digital fuel receipts; owners approve or reject claims with 1-click audit trails.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-200 hover:border-purple-500/50 transition-colors">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-white">Driver Roster & Dispatch</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Issue driver credentials, assign route corridors, and monitor active trip status.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Fleet Control System • Powered by Supabase & Three.js 3D WebGL</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-slate-300">Sign In</Link>
            <Link to="/signup" className="hover:text-slate-300">Register Fleet</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
