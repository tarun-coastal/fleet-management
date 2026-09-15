import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import type { DriverProfile, Vehicle } from '@/types';
import { Plus, Trash2, Search, UserPlus, Phone, Shield, Truck, Copy, Check, MapPin, KeyRound, Mail, Navigation } from 'lucide-react';
import { toast } from 'sonner';

export function DriversPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string; name: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: 'password',
    licenseNumber: '',
    licenseExpiry: '2028-05-15',
    assignedVehicleReg: 'MH 12 AB 1234',
    assignedRoute: 'Mumbai JNPT Port to Pune Chakan industrial corridor'
  });

  // Fetch Drivers
  const { data: driversData, isLoading } = useQuery({
    queryKey: ['drivers', searchTerm],
    queryFn: async () => {
      const res = await api.get('/drivers', {
        params: { search: searchTerm }
      });
      return (res.data?.results ?? []) as DriverProfile[];
    }
  });

  // Fetch Vehicles for assignment dropdown
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return (res.data?.results ?? []) as Vehicle[];
    }
  });

  const vehicles = vehiclesData || [];
  const drivers = driversData || [];

  // Keep assignedVehicleReg synced with first vehicle if available
  useEffect(() => {
    if (vehicles.length > 0 && (!form.assignedVehicleReg || form.assignedVehicleReg === 'MH 12 AB 1234')) {
      setForm(f => ({ ...f, assignedVehicleReg: vehicles[0].registrationNumber }));
    }
  }, [vehicles]);

  const addMutation = useMutation({
    mutationFn: (newDriverData: typeof form) => api.post('/drivers', newDriverData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsAddOpen(false);
      setCreatedCredentials({
        name: variables.name,
        email: variables.email,
        pass: variables.password
      });
      toast.success(`Driver ${variables.name} registered! Credentials ready.`);
      setForm({
        name: '',
        phone: '',
        email: '',
        password: 'password',
        licenseNumber: '',
        licenseExpiry: '2028-05-15',
        assignedVehicleReg: vehicles[0]?.registrationNumber || '',
        assignedRoute: 'Highway Express Delivery Corridor'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/drivers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver removed from active roster');
    }
  });

  const handleGenerateInvite = () => {
    const token = `inv_${Math.random().toString(36).substring(2, 9)}`;
    const url = `${window.location.origin}/invite/${token}`;
    setInviteLink(url);
    setInviteOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Drivers & Route Allocations</h1>
          <p className="text-sm text-slate-500">Register drivers, provision login credentials, assign vehicles and commercial transit routes</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateInvite}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Invite Link
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1.5" /> Add Driver & Assign Route
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register Driver & Provision Credentials</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(form); }} className="space-y-4 pt-1">
                {/* Driver Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Legal Name</Label>
                    <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Anil Sharma" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mobile Phone</Label>
                    <Input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 00000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Driving License No.</Label>
                    <Input required value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="DL-1420220019283" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">License Expiry Date</Label>
                    <Input type="date" required value={form.licenseExpiry} onChange={e => setForm(f => ({ ...f, licenseExpiry: e.target.value }))} />
                  </div>
                </div>

                {/* Assigned Vehicle & Assigned Route Section */}
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-3">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <Truck className="w-3.5 h-3.5 text-blue-600" /> Operational Assignment
                  </h4>

                  <div className="space-y-1">
                    <Label className="text-xs">Assign Fleet Vehicle</Label>
                    <select 
                      className="w-full border rounded-md p-2 text-xs bg-white text-slate-800"
                      value={form.assignedVehicleReg} 
                      onChange={e => setForm(f => ({ ...f, assignedVehicleReg: e.target.value }))}
                    >
                      {vehicles.map(v => (
                        <option key={v.id} value={v.registrationNumber}>
                          {v.registrationNumber} — {v.make} {v.model} ({v.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-blue-600" /> Assigned Dispatch Route
                    </Label>
                    <Input 
                      required 
                      value={form.assignedRoute} 
                      onChange={e => setForm(f => ({ ...f, assignedRoute: e.target.value }))} 
                      placeholder="e.g. Delhi to Jaipur NH48 Express Corridor" 
                    />
                    <p className="text-[10px] text-slate-400">
                      This route will appear directly on the driver console when they log in.
                    </p>
                  </div>
                </div>

                {/* Login Credentials Section */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Driver Login Credentials
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Driver Login Email</Label>
                      <Input 
                        type="email" 
                        required 
                        value={form.email} 
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                        placeholder="e.g. anil@fleet.com" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Password</Label>
                      <Input 
                        type="text" 
                        required 
                        value={form.password} 
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                        placeholder="password" 
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    The driver will use these credentials to log in on their smartphone browser at /login.
                  </p>
                </div>

                <Button type="submit" disabled={addMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
                  {addMutation.isPending ? 'Provisioning...' : 'Save Driver & Issue Credentials'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Credentials Created Confirmation Notice */}
      {createdCredentials && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
          <div>
            <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Driver Credentials Generated for {createdCredentials.name}!
            </h4>
            <p className="text-xs text-emerald-700 mt-1">
              Email: <span className="font-mono font-bold">{createdCredentials.email}</span> | Password: <span className="font-mono font-bold">{createdCredentials.pass}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100"
              onClick={() => {
                navigator.clipboard.writeText(`Driver Login: ${createdCredentials.email} | Password: ${createdCredentials.pass}`);
                toast.success('Credentials copied to clipboard!');
              }}
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy Details
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-xs text-emerald-800"
              onClick={() => setCreatedCredentials(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm max-w-md">
        <Search className="w-4 h-4 text-slate-400" />
        <Input 
          placeholder="Search by driver name or license number..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="border-0 p-0 shadow-none focus-visible:ring-0 text-xs"
        />
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver & Login</TableHead>
              <TableHead>Phone / Contact</TableHead>
              <TableHead>Assigned Vehicle</TableHead>
              <TableHead>Assigned Route</TableHead>
              <TableHead>License Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading drivers...</TableCell></TableRow>
            ) : drivers.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No drivers registered yet</TableCell></TableRow>
            ) : (
              drivers.map(d => (
                <TableRow key={d.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="font-bold text-sm text-slate-900">{d.name || 'Driver'}</div>
                    <span className="text-[11px] text-blue-600 font-mono flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400" /> {d.email || `${d.userId}@fleet.com`}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div>{d.phone}</div>
                    <span className="text-[10px] text-slate-400">Joined: {d.joiningDate}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {d.assignedVehicleReg ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        <Truck className="w-3.5 h-3.5" /> {d.assignedVehicleReg}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs max-w-xs">
                    {d.assignedRoute ? (
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Navigation className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{d.assignedRoute}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No designated route</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-mono text-slate-800 font-medium">{d.licenseNumber}</div>
                    <span className="text-[10px] text-slate-400">Exp: {d.licenseExpiry}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      d.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {d.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-8"
                      onClick={() => {
                        d.status = d.status === 'active' ? 'suspended' : 'active';
                        queryClient.invalidateQueries({ queryKey: ['drivers'] });
                        toast.info(`Driver status changed to ${d.status}`);
                      }}
                    >
                      {d.status === 'active' ? 'Suspend' : 'Activate'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Remove driver ${d.name}?`)) {
                          deleteMutation.mutate(d.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invite Driver Dialog */}
      {inviteOpen && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Driver Invitation Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-500">
                Send this invitation link to the driver via WhatsApp or SMS. 
                They can set their own password, upload their license photo, and start logging trips.
              </p>
              <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-md font-mono text-xs text-slate-700 break-all">
                {inviteLink}
              </div>
              <Button 
                className="w-full bg-blue-600"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  toast.success('Invitation link copied to clipboard!');
                  setInviteOpen(false);
                }}
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Link to Clipboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}