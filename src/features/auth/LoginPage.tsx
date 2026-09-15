import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Truck, Shield, UserCheck, Navigation, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import type { DriverProfile } from '@/types';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real registered drivers so user can 1-click test them
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-login-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/drivers');
        return (res.data?.results ?? []) as DriverProfile[];
      } catch (e) {
        return [];
      }
    }
  });

  const performLogin = async (loginIdentifier: string, loginPass: string) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { 
        email: loginIdentifier, 
        password: loginPass || 'password' 
      });
      setAuth(data.token, data.user);
      toast.success(`Signed in as ${data.user.name}!`);
      navigate(data.user.role === 'driver' ? '/driver' : '/dashboard');
    } catch (err: any) {
      setError('Invalid login identifier or password. Please verify your driver details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickFill = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-md border-slate-200">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center text-white font-black text-xl mb-2 shadow-sm">
            FL
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Sign In to Fleet Control</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Log in with your Owner, Manager, or Driver credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-semibold text-slate-700">
                Driver Email / Mobile / Name / Identifier
              </Label>
              <Input 
                id="identifier" 
                type="text" 
                placeholder="e.g. driver email, mobile number, or driver name" 
                required 
                value={email} 
                onChange={(e: any) => setEmail(e.target.value)} 
                className="text-sm"
              />
              <p className="text-[10px] text-slate-400">
                Drivers can log in using their email, mobile number, or name.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
                <span className="text-[11px] text-slate-400">Default: password</span>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password} 
                onChange={(e: any) => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="text-sm"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 font-semibold">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Dynamically List Registered Drivers If Any Exist */}
          {drivers.length > 0 && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-emerald-900">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Your Registered Drivers ({drivers.length})
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">1-Click Sign In</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {drivers.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => performLogin(d.email || d.name || 'driver', 'password')}
                    className="w-full p-2 bg-white border border-emerald-200 rounded-md text-left hover:border-emerald-400 hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-emerald-600" /> {d.name}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>{d.email || d.phone}</span>
                        {d.assignedVehicleReg && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-blue-600">{d.assignedVehicleReg}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Demo Fill Shortcut Chips */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Quick One-Click Test Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => performLogin('owner@test.com', 'password')}
                className="p-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border rounded-lg transition-colors text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-600" /> Owner
                </div>
                <div className="text-[10px] text-slate-400 truncate">owner@test.com</div>
              </button>

              <button
                type="button"
                onClick={() => performLogin('manager@test.com', 'password')}
                className="p-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border rounded-lg transition-colors text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-indigo-600" /> Manager
                </div>
                <div className="text-[10px] text-slate-400 truncate">manager@test.com</div>
              </button>

              <button
                type="button"
                onClick={() => performLogin('driver@test.com', 'password')}
                className="p-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border rounded-lg transition-colors text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-emerald-600" /> Driver
                </div>
                <div className="text-[10px] text-slate-400 truncate">driver@test.com</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2 italic">
              * Any new driver created by Owner or Manager can also log in immediately!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
