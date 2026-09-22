import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { signupOwner } from '@/lib/supabaseApi';
import { toast } from 'sonner';

export function SignupPage() {
  const [name, setName] = useState('');
  const [fleetName, setFleetName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !fleetName || !password) {
      toast.error('Please complete all required fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { user, token } = await signupOwner({ name, email, phone, password, fleetName });
      setAuth(token, user);
      toast.success('Account created! Welcome to Fleet Management.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Try a different email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Owner Account</CardTitle>
          <CardDescription>
            Register your commercial transport company on Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Your Full Name</Label>
              <Input required value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. Tarun Amaraneni" />
            </div>

            <div className="space-y-1.5">
              <Label>Fleet / Logistics Business Name</Label>
              <Input required value={fleetName} onChange={(e: any) => setFleetName(e.target.value)} placeholder="e.g. Coastal Roadlines Ltd." />
            </div>

            <div className="space-y-1.5">
              <Label>Mobile Phone</Label>
              <Input value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>

            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input type="email" required value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="owner@company.com" />
            </div>

            <div className="space-y-1.5">
              <Label>Password (min 6 characters)</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
              {isLoading ? 'Creating account...' : 'Create Account & Launch Dashboard'}
            </Button>

            <div className="text-center text-xs text-gray-500 pt-2">
              Already registered? <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
