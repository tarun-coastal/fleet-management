import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DocumentItem } from '@/types';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Clock, CheckCircle2, Plus, RefreshCw, ShieldCheck, FileCheck, Filter } from 'lucide-react';
import { toast } from 'sonner';

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [docTypeFilter, setDocTypeFilter] = useState('all');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [renewDoc, setRenewDoc] = useState<DocumentItem | null>(null);
  const [newExpiry, setNewExpiry] = useState('');

  const [newDocForm, setNewDocForm] = useState<Partial<DocumentItem>>({
    ownerType: 'vehicle',
    ownerName: 'MH 12 AB 1234',
    docType: 'insurance',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '2027-09-01'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await api.get('/documents');
      return res.data.results as DocumentItem[];
    }
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.put(`/documents/${id}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document marked verified');
    }
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, expiryDate }: { id: string; expiryDate: string }) => 
      api.put(`/documents/${id}/renew`, { expiryDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setRenewDoc(null);
      toast.success('Document successfully renewed');
    }
  });

  const addDocMutation = useMutation({
    mutationFn: (doc: Partial<DocumentItem>) => api.post('/documents', doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsAddOpen(false);
      toast.success('Document uploaded and added to vault');
    }
  });

  const rawDocs = data || [];

  const filteredDocs = rawDocs.filter(d => {
    if (ownerFilter !== 'all' && d.ownerType !== ownerFilter) return false;
    if (docTypeFilter !== 'all' && d.docType !== docTypeFilter) return false;
    return true;
  });

  const today = new Date();

  // Group into Expired, Expiring Soon, Valid
  const expiredDocs = filteredDocs.filter(d => differenceInCalendarDays(parseISO(d.expiryDate), today) < 0);
  const expiringSoonDocs = filteredDocs.filter(d => {
    const days = differenceInCalendarDays(parseISO(d.expiryDate), today);
    return days >= 0 && days <= 30;
  });
  const validDocs = filteredDocs.filter(d => differenceInCalendarDays(parseISO(d.expiryDate), today) > 30);

  const renderDocCard = (doc: DocumentItem, statusType: 'expired' | 'soon' | 'valid') => {
    const daysLeft = differenceInCalendarDays(parseISO(doc.expiryDate), today);

    return (
      <Card key={doc.id} className="shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {doc.docType}
              </span>
              <h3 className="font-bold text-base text-slate-900 mt-1">{doc.ownerName || doc.ownerId}</h3>
              <p className="text-xs text-slate-400 capitalize">{doc.ownerType} Document</p>
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block ${
                statusType === 'expired' ? 'bg-red-100 text-red-800' :
                statusType === 'soon' ? 'bg-amber-100 text-amber-800' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                {statusType === 'expired' ? `Expired (${Math.abs(daysLeft)}d ago)` :
                 statusType === 'soon' ? `${daysLeft} days left` : 'Valid'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs py-2 my-2 border-y border-slate-100 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px]">Issued Date</span>
              <span>{doc.issueDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Expiry Date</span>
              <span className="font-semibold text-slate-800">{doc.expiryDate}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center text-xs">
              {doc.verified ? (
                <span className="text-emerald-600 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <button 
                  onClick={() => verifyMutation.mutate(doc.id)} 
                  className="text-blue-600 hover:underline flex items-center gap-1 text-xs font-medium"
                >
                  <FileCheck className="w-3.5 h-3.5" /> Mark Verified
                </button>
              )}
            </div>

            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={() => {
                setRenewDoc(doc);
                setNewExpiry('2027-10-01');
              }}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Renew
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Statutory Documents Vault</h1>
          <p className="text-sm text-slate-500">Manage vehicle fitness certificates, PUC, permits, and driver licenses</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1.5" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Statutory Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addDocMutation.mutate(newDocForm); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Owner Type</Label>
                  <select 
                    className="w-full border rounded-md p-2 text-sm bg-white"
                    value={newDocForm.ownerType} 
                    onChange={e => setNewDocForm(f => ({ ...f, ownerType: e.target.value as any }))}
                  >
                    <option value="vehicle">Vehicle</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Document Type</Label>
                  <select 
                    className="w-full border rounded-md p-2 text-sm bg-white"
                    value={newDocForm.docType} 
                    onChange={e => setNewDocForm(f => ({ ...f, docType: e.target.value as any }))}
                  >
                    <option value="rc">RC (Registration Certificate)</option>
                    <option value="insurance">Insurance Policy</option>
                    <option value="permit">Commercial Permit</option>
                    <option value="puc">PUC Certificate</option>
                    <option value="fitness">Fitness Certificate</option>
                    <option value="license">Driver License</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Vehicle Reg. or Driver Name</Label>
                <Input 
                  required 
                  value={newDocForm.ownerName} 
                  onChange={e => setNewDocForm(f => ({ ...f, ownerName: e.target.value }))} 
                  placeholder="e.g. MH 12 AB 1234 or Ramesh Kumar" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Issue Date</Label>
                  <Input type="date" required value={newDocForm.issueDate} onChange={e => setNewDocForm(f => ({ ...f, issueDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expiry Date</Label>
                  <Input type="date" required value={newDocForm.expiryDate} onChange={e => setNewDocForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>

              <Button type="submit" disabled={addDocMutation.isPending} className="w-full bg-blue-600">
                {addDocMutation.isPending ? 'Saving...' : 'Add to Vault'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </div>
        <select 
          value={ownerFilter} 
          onChange={e => setOwnerFilter(e.target.value)}
          className="text-xs border rounded px-2.5 py-1.5 bg-white text-slate-700"
        >
          <option value="all">All Owners (Vehicles & Drivers)</option>
          <option value="vehicle">Vehicles Only</option>
          <option value="driver">Drivers Only</option>
        </select>

        <select 
          value={docTypeFilter} 
          onChange={e => setDocTypeFilter(e.target.value)}
          className="text-xs border rounded px-2.5 py-1.5 bg-white text-slate-700"
        >
          <option value="all">All Document Types</option>
          <option value="rc">RC</option>
          <option value="insurance">Insurance</option>
          <option value="permit">Permit</option>
          <option value="puc">PUC</option>
          <option value="fitness">Fitness</option>
          <option value="license">License</option>
        </select>

        <div className="ml-auto text-xs text-slate-400">
          Showing {filteredDocs.length} total documents
        </div>
      </div>

      {/* Section 1: Expired (Red Alert) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-red-700 font-bold text-sm bg-red-50 p-2.5 rounded-md border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>Expired Documents ({expiredDocs.length}) — Action Required Immediately</span>
        </div>
        {expiredDocs.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-2">No expired documents. All compliance up to date!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiredDocs.map(d => renderDocCard(d, 'expired'))}
          </div>
        )}
      </div>

      {/* Section 2: Expiring Soon (Amber Warning) */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm bg-amber-50 p-2.5 rounded-md border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Expiring Within 30 Days ({expiringSoonDocs.length}) — Plan Renewal</span>
        </div>
        {expiringSoonDocs.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-2">No documents due for renewal in the next 30 days.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringSoonDocs.map(d => renderDocCard(d, 'soon'))}
          </div>
        )}
      </div>

      {/* Section 3: Valid (Green Safe) */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm bg-emerald-50 p-2.5 rounded-md border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Valid Documents ({validDocs.length})</span>
        </div>
        {validDocs.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-2">No valid documents in this filter view.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {validDocs.map(d => renderDocCard(d, 'valid'))}
          </div>
        )}
      </div>

      {/* Renew Modal Dialog */}
      {renewDoc && (
        <Dialog open={!!renewDoc} onOpenChange={() => setRenewDoc(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Renew {renewDoc.docType.toUpperCase()}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              renewMutation.mutate({ id: renewDoc.id, expiryDate: newExpiry }); 
            }} className="space-y-4">
              <p className="text-xs text-slate-500">
                Renewing document for <strong className="text-slate-800">{renewDoc.ownerName}</strong>. 
                Previous history is preserved.
              </p>

              <div className="space-y-1">
                <Label className="text-xs">New Expiry Date</Label>
                <Input type="date" required value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Upload Scanned Copy / Photo</Label>
                <Input type="file" className="text-xs" />
              </div>

              <Button type="submit" disabled={renewMutation.isPending} className="w-full bg-blue-600">
                {renewMutation.isPending ? 'Saving...' : 'Confirm Renewal'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}