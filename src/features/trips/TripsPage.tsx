import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import type { Trip } from '@/types';
import { Activity, Plus, MapPin, Calendar, Clock, Truck, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function TripsPage() {
  const queryClient = useQueryClient();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isLogOpen, setIsLogOpen] = useState(false);

  const [form, setForm] = useState<Partial<Trip>>({
    vehicleId: 'MH 12 AB 1234',
    driverId: 'Ramesh Kumar',
    distanceKm: 120,
    notes: 'Warehouse transfer run'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const res = await api.get('/trips');
      return (res.data?.results ?? []) as Trip[];
    }
  });

  const logTripMutation = useMutation({
    mutationFn: (trip: Partial<Trip>) => api.post('/trips/start', trip),
    onSuccess: (res) => {
      // immediately mark completed
      api.post(`/trips/${res.data.id}/end`, { distanceKm: form.distanceKm });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsLogOpen(false);
      toast.success('Commercial trip entry recorded');
    }
  });

  const trips = data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commercial Trip Logs</h1>
          <p className="text-sm text-slate-500">Every dispatch, journey distance, start/end timestamps, and route notes</p>
        </div>

        <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1.5" /> Log Completed Trip
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Trip Summary</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); logTripMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Vehicle Plate</Label>
                  <Input required value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Driver</Label>
                  <Input required value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Total Distance (km)</Label>
                <Input type="number" required value={form.distanceKm || ''} onChange={e => setForm(f => ({ ...f, distanceKm: Number(e.target.value) }))} placeholder="140" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Route Summary / Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Pune Chakan Hub to Mumbai Port" />
              </div>

              <Button type="submit" disabled={logTripMutation.isPending} className="w-full bg-blue-600">
                {logTripMutation.isPending ? 'Logging...' : 'Save Trip Record'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading trip logs...</TableCell></TableRow>
            ) : trips.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No trips recorded yet</TableCell></TableRow>
            ) : (
              trips.map((trip) => (
                <TableRow key={trip.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-bold text-slate-900">{trip.vehicleId}</TableCell>
                  <TableCell className="text-xs text-slate-700">{trip.driverId}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(trip.startTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {trip.endTime ? `${new Date(trip.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${new Date(trip.endTime).toLocaleDateString()}` : '—'}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900 text-xs">
                    {trip.distanceKm ? `${trip.distanceKm} km` : 'In Progress'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      trip.status === 'completed' 
                        ? 'bg-slate-100 text-slate-800' 
                        : 'bg-emerald-100 text-emerald-800 animate-pulse'
                    }`}>
                      {trip.status === 'completed' ? 'Completed' : '● Live Ongoing'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-blue-600 hover:bg-blue-50 text-xs"
                      onClick={() => setSelectedTrip(trip)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Trip Details Dialog */}
      {selectedTrip && (
        <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Trip Details — {selectedTrip.vehicleId}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Driver</span>
                  <span className="font-semibold text-slate-800">{selectedTrip.driverId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Started At</span>
                  <span className="font-medium text-slate-700">{new Date(selectedTrip.startTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed At</span>
                  <span className="font-medium text-slate-700">{selectedTrip.endTime ? new Date(selectedTrip.endTime).toLocaleString() : 'In Progress'}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-500">Logged Distance</span>
                  <span className="font-bold text-base text-blue-600">{selectedTrip.distanceKm || 0} km</span>
                </div>
              </div>

              {selectedTrip.notes && (
                <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Route Log</span>
                  <p className="text-slate-700 mt-0.5">{selectedTrip.notes}</p>
                </div>
              )}

              <Button className="w-full bg-blue-600" onClick={() => setSelectedTrip(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}