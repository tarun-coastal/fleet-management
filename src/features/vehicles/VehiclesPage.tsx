import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import type { Vehicle } from '@/types';
import { Plus, Trash2, Search, Filter, Truck, FileUp, Eye, ShieldCheck, AlertCircle, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

export function VehiclesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    registrationNumber: '',
    make: '',
    model: '',
    year: 2023,
    type: 'truck',
    fuelType: 'diesel',
    odometerReading: 12000,
    status: 'active'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', searchTerm, statusFilter],
    queryFn: async () => {
      const res = await api.get('/vehicles', {
        params: {
          search: searchTerm,
          status: statusFilter
        }
      });
      return (res.data?.results ?? []) as Vehicle[];
    }
  });

  const addMutation = useMutation({
    mutationFn: (vehicle: Partial<Vehicle>) => api.post('/vehicles', vehicle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsAddOpen(false);
      toast.success('Vehicle registered successfully');
      setNewVehicle({ registrationNumber: '', make: '', model: '', year: 2023, type: 'truck', fuelType: 'diesel', odometerReading: 10000, status: 'active' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSelectedVehicle(null);
      toast.success('Vehicle record archived');
    }
  });

  const handleBulkImport = () => {
    toast.info('Simulating CSV Fleet import: 2 vehicles imported!');
  };

  const vehicles = data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Vehicles</h1>
          <p className="text-sm text-slate-500">Manage all registered commercial vehicles, fuel profiles, and driver assignments</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkImport}>
            <FileUp className="w-4 h-4 mr-1.5" /> CSV Import
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1.5" /> Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Register New Fleet Vehicle</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(newVehicle); }} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Registration Plate Number</Label>
                  <Input 
                    required 
                    value={newVehicle.registrationNumber} 
                    onChange={e => setNewVehicle(v => ({ ...v, registrationNumber: e.target.value }))} 
                    placeholder="MH 12 AB 1234" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Manufacturer (Make)</Label>
                    <Input required value={newVehicle.make} onChange={e => setNewVehicle(v => ({ ...v, make: e.target.value }))} placeholder="Tata / Ashok Leyland" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Model</Label>
                    <Input required value={newVehicle.model} onChange={e => setNewVehicle(v => ({ ...v, model: e.target.value }))} placeholder="Signa 4825.TK" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <select 
                      className="w-full border rounded-md p-2 text-xs bg-white"
                      value={newVehicle.type} 
                      onChange={e => setNewVehicle(v => ({ ...v, type: e.target.value as any }))}
                    >
                      <option value="truck">Truck</option>
                      <option value="van">Van</option>
                      <option value="bus">Bus</option>
                      <option value="car">Car</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fuel</Label>
                    <select 
                      className="w-full border rounded-md p-2 text-xs bg-white"
                      value={newVehicle.fuelType} 
                      onChange={e => setNewVehicle(v => ({ ...v, fuelType: e.target.value as any }))}
                    >
                      <option value="diesel">Diesel</option>
                      <option value="cng">CNG</option>
                      <option value="petrol">Petrol</option>
                      <option value="electric">Electric</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Year</Label>
                    <Input type="number" value={newVehicle.year} onChange={e => setNewVehicle(v => ({ ...v, year: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Current Odometer Reading (km)</Label>
                  <Input type="number" value={newVehicle.odometerReading} onChange={e => setNewVehicle(v => ({ ...v, odometerReading: Number(e.target.value) }))} />
                </div>

                <Button type="submit" disabled={addMutation.isPending} className="w-full bg-blue-600">
                  {addMutation.isPending ? 'Registering...' : 'Save Vehicle'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input 
            placeholder="Search by registration plate, make or model..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border rounded px-2.5 py-2 bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inService">In Service</option>
            <option value="idle">Idle</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>Fuel & Odo</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading vehicles...</TableCell></TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No vehicles found matching filters</TableCell></TableRow>
            ) : (
              vehicles.map(v => (
                <TableRow key={v.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="font-bold text-sm text-slate-900">{v.registrationNumber}</div>
                    <span className="text-[10px] text-slate-400 uppercase">{v.type}</span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-800 text-xs">{v.make} {v.model}</div>
                    <div className="text-[10px] text-slate-400">Mfg: {v.year}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold capitalize text-slate-800">{v.fuelType}</div>
                    <div className="text-[11px] text-slate-500">{v.odometerReading.toLocaleString('en-IN')} km</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {v.assignedDriverId ? (
                      <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Assigned</span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* Compliance Health Dot */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        v.status === 'maintenance' ? 'bg-red-500' : 'bg-emerald-500'
                      }`}></span>
                      <span className="text-slate-600 text-xs">
                        {v.status === 'maintenance' ? 'Check Expired' : 'All Docs Valid'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      v.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      v.status === 'inService' ? 'bg-blue-100 text-blue-800' :
                      v.status === 'idle' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {v.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-blue-600" 
                      onClick={() => setSelectedVehicle(v)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Archive vehicle ${v.registrationNumber}?`)) {
                          deleteMutation.mutate(v.id);
                        }
                      }}
                      title="Delete"
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

      {/* Vehicle Details Modal (Overview, Docs, Trips, Expenses) */}
      {selectedVehicle && (
        <Dialog open={!!selectedVehicle} onOpenChange={() => setSelectedVehicle(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>{selectedVehicle.registrationNumber} — Details</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-slate-400 text-xs block">Make & Model</span>
                  <span className="font-bold text-slate-800">{selectedVehicle.make} {selectedVehicle.model}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">Odometer</span>
                  <span className="font-bold text-slate-800">{selectedVehicle.odometerReading.toLocaleString()} km</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">Fuel Type</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedVehicle.fuelType}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">Operational Status</span>
                  <span className="font-semibold text-emerald-600 capitalize">{selectedVehicle.status}</span>
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-xs text-slate-700 uppercase mb-2">Attached Statutory Documents</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-white border rounded">
                    <span>RC (Registration Certificate)</span>
                    <span className="text-emerald-600 font-medium">Valid until 2037</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white border rounded">
                    <span>Comprehensive Insurance</span>
                    <span className="text-amber-600 font-medium">Due in 15 days</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast.success('Driver reassigned')}
                >
                  Change Driver
                </Button>
                <Button 
                  size="sm" 
                  className="bg-blue-600"
                  onClick={() => setSelectedVehicle(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}