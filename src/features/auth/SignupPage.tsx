import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function SignupPage() {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [fleetName, setFleetName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !fleetName) {
      toast.error('Please complete all required fields');
      return;
    }
    setStep('otp');
    toast.info('Verification OTP sent: Use 123456');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '123456' && otp !== '111111') {
      toast.error('Invalid OTP. Please enter 123456');
      return;
    }

    try {
      await api.post('/auth/signup', { name, email, phone, fleetName });
      // auto login
      setAuth('mock-jwt-owner', {
        id: `u${Date.now()}`,
        name,
        email,
        phone,
        role: 'owner',
        fleetId: `f${Date.now()}`,
        createdAt: new Date().toISOString()
      });
      toast.success('Account created successfully! Welcome to Fleet Management.');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Owner Account</CardTitle>
          <CardDescription>
            {step === 'details' ? 'Register your commercial transport company' : 'Enter the 6-digit OTP sent to your phone'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'details' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Your Full Name</Label>
                <Input required value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. Tarun Amaraneni" />
              </div>

              <div className="space-y-1.5">
                <Label>Fleet / Logistics Business Name</Label>
                <Input required value={fleetName} onChange={(e: any) => setFleetName(e.target.value)} placeholder="e.g. Coastal Roadlines Ltd." />
              </div>

              <div className="space-y-1.5">
                <Label>Mobile Phone (for SMS alerts)</Label>
                <Input required value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>

              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input type="email" required value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="owner@company.com" />
              </div>

              <div className="space-y-1.5">
                <Label>Choose Password</Label>
                <Input type="password" required value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Continue to Verification
              </Button>

              <div className="text-center text-xs text-gray-500 pt-2">
                Already registered? <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md">
                Demo OTP Code: <span className="font-bold">123456</span>
              </div>

              <div className="space-y-1.5">
                <Label>Enter 6-digit OTP</Label>
                <Input required maxLength={6} value={otp} onChange={(e: any) => setOtp(e.target.value)} placeholder="123456" className="text-center tracking-widest text-lg font-mono" />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Verify & Launch Dashboard
              </Button>

              <button type="button" onClick={() => setStep('details')} className="w-full text-xs text-gray-500 hover:underline">
                Back to details
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
