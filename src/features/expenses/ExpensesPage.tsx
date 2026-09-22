import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenses, createExpense, approveExpense, rejectExpense } from '@/lib/supabaseApi';
import type { Expense } from '@/types';
import { useAuthStore } from '@/lib/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Download, Check, X, IndianRupee, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function ExpensesPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const isOwnerOrManager = currentUser?.role === 'owner' || currentUser?.role === 'manager';

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [form, setForm] = useState<Partial<Expense>>({
    vehicleId: 'MH 12 AB 1234',
    category: 'fuel',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    odometerAtEntry: 45200
  });

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', categoryFilter, statusFilter],
    queryFn: () => getExpenses(categoryFilter, statusFilter)
  });

  const expenses = data || [];
  const totalAmount = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  const addMutation = useMutation({
    mutationFn: (newExp: Partial<Expense>) => createExpense(newExp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsAddOpen(false);
      toast.success('Expense submitted for approval');
      setForm({ vehicleId: 'MH 12 AB 1234', category: 'fuel', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit expense');
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense marked Approved');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve expense');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.error('Expense Rejected');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reject expense');
    }
  });

  const handleExportCSV = () => {
    const headers = 'ID,Vehicle,Driver,Category,Amount,Date,Status\n';
    const rows = expenses.map(e => `${e.id},${e.vehicleId},${e.driverId},${e.category},${e.amount},${e.date},${e.approved}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet_expenses_${Date.now()}.csv`;
    a.click();
  };

  const categories = ['all', 'fuel', 'toll', 'maintenance', 'repair', 'fine', 'other'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expenses & Fuel Claims</h1>
          <p className="text-sm text-gray-500">Track fuel bills, tolls, maintenance invoices and manager approvals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Submit Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submit New Fleet Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(form); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <select 
                      className="w-full border rounded-md p-2 text-sm bg-white"
                      value={form.category} 
                      onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                    >
                      <option value="fuel">Fuel / Diesel</option>
                      <option value="toll">Toll / Fastag</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="repair">Repair</option>
                      <option value="fine">Traffic Challan/Fine</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount (₹)</Label>
                    <Input 
                      type="number" 
                      required 
                      value={form.amount || ''} 
                      onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} 
                      placeholder="e.g. 2500" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Vehicle Registration</Label>
                    <Input 
                      required 
                      value={form.vehicleId} 
                      onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))} 
                      placeholder="MH 12 AB 1234" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input 
                      type="date" 
                      required 
                      value={form.date} 
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))} 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Odometer Reading (km)</Label>
                  <Input 
                    type="number" 
                    value={form.odometerAtEntry || ''} 
                    onChange={e => setForm(f => ({ ...f, odometerAtEntry: Number(e.target.value) }))} 
                    placeholder="e.g. 45200" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notes / Vendor details</Label>
                  <Input 
                    value={form.notes} 
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
                    placeholder="e.g. HPCL Petrol pump 35L" 
                  />
                </div>

                <Button type="submit" disabled={addMutation.isPending} className="w-full bg-blue-600">
                  {addMutation.isPending ? 'Submitting...' : 'Submit Claim'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Pills & Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-lg border shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
                categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="text-sm font-semibold text-gray-800 flex items-center gap-1">
          <span>Filter Total:</span>
          <span className="text-emerald-700 text-base">₹{totalAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vehicle & Driver</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              {isOwnerOrManager && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading expenses...</TableCell></TableRow>
            ) : expenses.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No expenses match your filters</TableCell></TableRow>
            ) : (
              expenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell>
                    {exp.receiptPhotoUrl ? (
                      <a href={exp.receiptPhotoUrl} target="_blank" rel="noreferrer">
                        <img src={exp.receiptPhotoUrl} alt="receipt" className="w-10 h-10 object-cover rounded border hover:opacity-80 transition-opacity" />
                      </a>
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize font-medium text-gray-900">{exp.category}</span>
                    {exp.notes && <p className="text-xs text-gray-400 truncate max-w-xs">{exp.notes}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-xs text-gray-900">{exp.vehicleId}</div>
                    <div className="text-xs text-gray-500">{exp.driverId}</div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">{exp.date}</TableCell>
                  <TableCell className="font-bold text-gray-900">₹{exp.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      exp.approved === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      exp.approved === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {exp.approved}
                    </span>
                  </TableCell>
                  {isOwnerOrManager && (
                    <TableCell className="text-right space-x-1">
                      {exp.approved === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 h-8 px-2"
                            onClick={() => approveMutation.mutate(exp.id)}
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-300 hover:bg-red-50 h-8 px-2"
                            onClick={() => rejectMutation.mutate(exp.id)}
                          >
                            <X className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {exp.approved !== 'pending' && (
                        <span className="text-xs text-gray-400 italic">Settled</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}