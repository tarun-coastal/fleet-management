import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  LogOut, Home, Truck, Users, FileText, Map, Activity, 
  Bell, Settings, Wrench, Shield, UserCircle, ChevronRight 
} from 'lucide-react';
import { toast } from 'sonner';

export function AppLayout() {
  const { user, logout, setAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.results;
    },
    refetchInterval: 10000
  });

  const unreadNotifs = notifs?.filter((n: any) => !n.read).length || 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Logged out successfully');
  };

  // 1-Click Role Switcher for seamless evaluation
  const handleSwitchRole = (newRole: 'owner' | 'manager' | 'driver') => {
    if (newRole === 'owner') {
      setAuth('mock-jwt-owner', {
        id: '1',
        name: 'Tarun (Owner)',
        email: 'owner@test.com',
        role: 'owner',
        fleetId: 'f1',
        phone: '+91 98765 00000',
        createdAt: '2024-01-01T00:00:00Z'
      });
      navigate('/dashboard');
      toast.success('Switched to Owner role view');
    } else if (newRole === 'manager') {
      setAuth('mock-jwt-manager', {
        id: '5',
        name: 'Ops Manager',
        email: 'manager@test.com',
        role: 'manager',
        fleetId: 'f1',
        phone: '+91 98765 11111',
        createdAt: '2024-01-01T00:00:00Z'
      });
      navigate('/dashboard');
      toast.success('Switched to Operations Manager role view');
    } else {
      setAuth('mock-jwt-driver', {
        id: '2',
        name: 'Ramesh Kumar (Driver)',
        email: 'driver@test.com',
        role: 'driver',
        fleetId: 'f1',
        phone: '+91 98765 43210',
        createdAt: '2024-01-01T00:00:00Z'
      });
      navigate('/driver');
      toast.success('Switched to Driver mobile-first console');
    }
  };

  const isDriver = user?.role === 'driver';

  const navItems = isDriver ? [
    { label: 'Console', path: '/driver', icon: Home },
    { label: 'My Trips', path: '/driver/trips', icon: Activity },
    { label: 'My Expenses', path: '/driver/expenses', icon: FileText },
    { label: 'Documents', path: '/driver/documents', icon: FileText },
    { label: 'Profile', path: '/driver/settings', icon: Settings },
  ] : [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Live Radar', path: '/tracking', icon: Map },
    { label: 'Vehicles', path: '/vehicles', icon: Truck },
    { label: 'Drivers', path: '/drivers', icon: Users },
    { label: 'Doc Vault', path: '/documents', icon: FileText },
    { label: 'Trip Logs', path: '/trips', icon: Activity },
    { label: 'Expenses', path: '/expenses', icon: FileText },
    { label: 'Analytics', path: '/analytics', icon: Activity },
    { label: 'Maintenance', path: '/maintenance', icon: Wrench },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              FL
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-slate-900 leading-tight">Coastal Fleet</h2>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> 4 Units Connected
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-medium uppercase bg-slate-200 text-slate-700">
                  {user?.role}
                </span>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm md:text-base text-slate-800">
              {isDriver ? 'Driver Portal' : 'Fleet Operations Control'}
            </span>
          </div>

          {/* Quick Role Switcher Bar */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg text-xs">
              <span className="text-slate-400 px-2 text-[11px] font-medium">Switch View:</span>
              <button 
                onClick={() => handleSwitchRole('owner')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${user?.role === 'owner' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                👑 Owner
              </button>
              <button 
                onClick={() => handleSwitchRole('manager')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${user?.role === 'manager' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                👔 Manager
              </button>
              <button 
                onClick={() => handleSwitchRole('driver')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${user?.role === 'driver' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🚚 Driver
              </button>
            </div>

            {/* Notification Bell */}
            <Link to="/notifications" className="relative p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-slate-100">
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifs}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-1 z-30 shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex flex-col items-center py-1.5 px-3 rounded-lg ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
