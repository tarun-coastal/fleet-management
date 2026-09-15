import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MaintenanceRecord } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wrench, Plus, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<Partial<MaintenanceRecord>>({
    vehicleId: 'MH 12 AB 1234',
    title: '',
    description: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    cost: 0,
    status: 'scheduled'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const res = await api.get('/maintenance');
      return res.data.results as MaintenanceRecord[];
    }
  });

  const addMutation = useMutation({
    mutationFn: (rec: Partial<MaintenanceRecord>) => api.post('/maintenance', rec),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setIsAddOpen(false);
      toast.success('Maintenance task scheduled');
      setForm({ vehicleId: 'MH 12 AB 1234', title: '', description: '', cost: 0, status: 'scheduled' });
    }
  });

  const records = data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" /> Fleet Maintenance & Overhauls
          </h1>
          <p className="text-sm text-gray-500">Preventive maintenance, service schedules, oil changes and garage costs</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1.5" /> Schedule Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Vehicle Service</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(form); }} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Vehicle Registration</Label>
                <Input required value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))} placeholder="MH 12 AB 1234" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Service Task Title</Label>
                <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. 50,000km Major Service & Brake pads" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description / Garage instructions</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Engine oil change, air filter replacement" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Scheduled Date</Label>
                  <Input type="date" required value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Estimated Cost (₹)</Label>
                  <Input type="number" value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} placeholder="e.g. 8500" />
                </div>
              </div>

              <Button type="submit" disabled={addMutation.isPending} className="w-full bg-blue-600">
                {addMutation.isPending ? 'Saving...' : 'Confirm Schedule'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Service Task</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading records...</TableCell></TableRow>
            ) : records.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">No maintenance tasks scheduled</TableCell></TableRow>
            ) : (
              records.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold text-gray-900">{item.vehicleId}</TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{item.title}</div>
                    {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">{item.scheduledDate}</TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    {item.cost ? `₹${item.cost.toLocaleString('en-IN')}` : '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span className="capitalize">{item.status.replace('_', ' ')}</span>
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}