import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Shield, Bell, Building2, Save } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPage() {
  const user = useAuthStore(s => s.user);

  const [name, setName] = useState(user?.name || 'Fleet Admin');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [fleetName, setFleetName] = useState('Coastal Logistics Fleet');
  const [currency] = useState('INR (₹)');
  const [distanceUnit] = useState('Kilometers (km)');
  const [timezone] = useState('Asia/Kolkata (IST +5:30)');

  // Notification toggles
  const [notifyExpiry, setNotifyExpiry] = useState(true);
  const [notifyExpenses, setNotifyExpenses] = useState(true);
  const [notifyIdle, setNotifyIdle] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Fleet settings and profile updated successfully');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" /> Fleet Settings & Profile
        </h1>
        <p className="text-sm text-gray-500">Configure company organization, localization parameters, and notification alerts</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" /> User Profile & Role
            </CardTitle>
            <CardDescription>Your registered identity and login credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address</Label>
                <Input value={user?.email || 'owner@test.com'} disabled className="bg-gray-50" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assigned Role</Label>
                <Input value={user?.role?.toUpperCase() || 'OWNER'} disabled className="bg-gray-50 font-semibold" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fleet & Regional Preferences */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Fleet Localization & Units
            </CardTitle>
            <CardDescription>Standard measurement units across dashboards and expense logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Fleet / Commercial Enterprise Name</Label>
              <Input value={fleetName} onChange={e => setFleetName(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Currency</Label>
                <Input value={currency} disabled className="bg-gray-50 text-gray-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Odometer / Distance Units</Label>
                <Input value={distanceUnit} disabled className="bg-gray-50 text-gray-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fleet Timezone</Label>
                <Input value={timezone} disabled className="bg-gray-50 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Config */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" /> Alert Thresholds & Channels
            </CardTitle>
            <CardDescription>Configure when to receive in-app and browser notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 divide-y">
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium text-gray-800">Document Expiry Reminders</p>
                <p className="text-xs text-gray-400">Trigger warnings at 30, 15, 7 and 1 day before expiration</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifyExpiry} 
                onChange={e => setNotifyExpiry(e.target.checked)} 
                className="w-4 h-4 accent-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <p className="text-sm font-medium text-gray-800">New Expense Submissions</p>
                <p className="text-xs text-gray-400">Notify immediately when drivers upload fuel slips</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifyExpenses} 
                onChange={e => setNotifyExpenses(e.target.checked)} 
                className="w-4 h-4 accent-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Excessive Vehicle Idle Alerts</p>
                <p className="text-xs text-gray-400">Notify when vehicle engine is idling over 2 hours during work shifts</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifyIdle} 
                onChange={e => setNotifyIdle(e.target.checked)} 
                className="w-4 h-4 accent-blue-600 rounded"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" /> Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}