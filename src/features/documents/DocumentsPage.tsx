import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocuments, createDocument, verifyDocument, renewDocument, deleteDocument, getVehicles, getDrivers } from '@/lib/supabaseApi';
import type { DocumentItem, Vehicle, DriverProfile } from '@/types';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, Clock, CheckCircle2, Plus, RefreshCw, ShieldCheck, 
  FileCheck, Filter, Eye, Trash2, FileText, Download, Upload, ExternalLink, Image as ImageIcon 
} from 'lucide-react';
import { toast } from 'sonner';

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [docTypeFilter, setDocTypeFilter] = useState('all');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [renewDoc, setRenewDoc] = useState<DocumentItem | null>(null);
  const [newExpiry, setNewExpiry] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; dataUrl: string; type: string } | null>(null);
  const [renewFile, setRenewFile] = useState<{ name: string; dataUrl: string } | null>(null);

  // Fetch real registered vehicles & drivers from Supabase
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => getVehicles()
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => getDrivers()
  });

  const [newDocForm, setNewDocForm] = useState<Partial<DocumentItem>>({
    ownerType: 'vehicle',
    ownerName: '',
    docType: 'insurance',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '2027-09-01'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => getDocuments()
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifyDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document marked verified');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to verify document');
    }
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, expiryDate, fileUrl }: { id: string; expiryDate: string; fileUrl?: string }) =>
      renewDocument(id, expiryDate, fileUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setRenewDoc(null);
      setRenewFile(null);
      toast.success('Document successfully renewed');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to renew document');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document removed from vault');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete document');
    }
  });

  const addDocMutation = useMutation({
    mutationFn: (doc: Partial<DocumentItem>) => createDocument(doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsAddOpen(false);
      setSelectedFile(null);
      toast.success('Document uploaded and added to vault');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add document');
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isRenew: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (isRenew) {
        setRenewFile({ name: file.name, dataUrl });
      } else {
        setSelectedFile({ name: file.name, dataUrl, type: file.type });
      }
    };
    reader.readAsDataURL(file);
  };

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

  const hasRealFile = (url?: string) => url && url !== '#' && (url.startsWith('data:') || url.startsWith('http'));

  const renderDocCard = (doc: DocumentItem, statusType: 'expired' | 'soon' | 'valid') => {
    const daysLeft = differenceInCalendarDays(parseISO(doc.expiryDate), today);
    const hasFile = hasRealFile(doc.fileUrl);

    return (
      <Card key={doc.id} className="shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
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

          <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px]">Issued Date</span>
              <span>{doc.issueDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Expiry Date</span>
              <span className="font-semibold text-slate-800">{doc.expiryDate}</span>
            </div>
          </div>

          {/* Document Preview Thumbnail if available */}
          {hasFile && (
            <div 
              onClick={() => setPreviewDoc(doc)}
              className="cursor-pointer bg-slate-50 border border-slate-200 rounded p-2 flex items-center justify-between hover:bg-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium truncate">
                {doc.fileUrl.startsWith('data:image') ? (
                  <ImageIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
                <span className="truncate">Attached Document File</span>
              </div>
              <span className="text-[11px] text-blue-600 flex items-center gap-1 font-bold group-hover:underline">
                <Eye className="w-3.5 h-3.5" /> View
              </span>
            </div>
          )}

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

            <div className="flex gap-1.5">
              {hasFile && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => setPreviewDoc(doc)}
                  title="Preview Document"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                </Button>
              )}

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

              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`Remove document for ${doc.ownerName || doc.ownerId}?`)) {
                    deleteMutation.mutate(doc.id);
                  }
                }}
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
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
          <p className="text-sm text-slate-500">Upload, view, and manage vehicle RC, insurance, PUC, permits, and driver licenses</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1.5" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Statutory Document to Vault</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              addDocMutation.mutate({
                ...newDocForm,
                fileUrl: selectedFile?.dataUrl || '#'
              }); 
            }} className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Owner Type</Label>
                  <select 
                    className="w-full border rounded-md p-2 text-xs bg-white text-slate-800"
                    value={newDocForm.ownerType} 
                    onChange={e => {
                      const type = e.target.value as any;
                      setNewDocForm(f => ({ 
                        ...f, 
                        ownerType: type,
                        ownerName: type === 'vehicle' ? (vehicles[0]?.registrationNumber || '') : (drivers[0]?.name || '')
                      }));
                    }}
                  >
                    <option value="vehicle">Vehicle</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Document Type</Label>
                  <select 
                    className="w-full border rounded-md p-2 text-xs bg-white text-slate-800"
                    value={newDocForm.docType} 
                    onChange={e => setNewDocForm(f => ({ ...f, docType: e.target.value as any }))}
                  >
                    <option value="rc">RC (Registration Certificate)</option>
                    <option value="insurance">Insurance Policy</option>
                    <option value="permit">Commercial Permit</option>
                    <option value="puc">PUC Certificate</option>
                    <option value="fitness">Fitness Certificate</option>
                    <option value="license">Driver License</option>
                    <option value="idProof">ID Proof / Aadhaar</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Vehicle or Driver Selector */}
              <div className="space-y-1">
                <Label className="text-xs">
                  {newDocForm.ownerType === 'vehicle' ? 'Select Registered Vehicle' : 'Select Registered Driver'}
                </Label>
                {newDocForm.ownerType === 'vehicle' ? (
                  vehicles.length > 0 ? (
                    <select
                      className="w-full border rounded-md p-2 text-xs bg-white text-slate-800"
                      value={newDocForm.ownerName || vehicles[0]?.registrationNumber}
                      onChange={e => setNewDocForm(f => ({ ...f, ownerName: e.target.value, ownerId: e.target.value }))}
                    >
                      {vehicles.map(v => (
                        <option key={v.id} value={v.registrationNumber}>
                          {v.registrationNumber} — {v.make} {v.model} ({v.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input 
                      required 
                      value={newDocForm.ownerName} 
                      onChange={e => setNewDocForm(f => ({ ...f, ownerName: e.target.value, ownerId: e.target.value }))} 
                      placeholder="e.g. MH 12 AB 1234" 
                    />
                  )
                ) : (
                  drivers.length > 0 ? (
                    <select
                      className="w-full border rounded-md p-2 text-xs bg-white text-slate-800"
                      value={newDocForm.ownerName || drivers[0]?.name}
                      onChange={e => setNewDocForm(f => ({ ...f, ownerName: e.target.value, ownerId: e.target.value }))}
                    >
                      {drivers.map(d => (
                        <option key={d.id} value={d.name || d.id}>
                          {d.name} ({d.email || d.phone})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input 
                      required 
                      value={newDocForm.ownerName} 
                      onChange={e => setNewDocForm(f => ({ ...f, ownerName: e.target.value, ownerId: e.target.value }))} 
                      placeholder="e.g. Anil Sharma" 
                    />
                  )
                )}
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

              {/* Real File Upload Box */}
              <div className="space-y-1">
                <Label className="text-xs">Attach Document File (PDF or Image)</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                  <Input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
                  />
                  {selectedFile && (
                    <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> File ready: {selectedFile.name}
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={addDocMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
                {addDocMutation.isPending ? 'Uploading...' : 'Save & Attach to Vault'}
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
          <option value="idProof">ID Proof</option>
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

      {/* Document Viewer Modal */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>{previewDoc.ownerName} — {previewDoc.docType.toUpperCase()} Document</span>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-2 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Owner</span>
                  <span className="font-bold text-slate-800">{previewDoc.ownerName || previewDoc.ownerId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Document Type</span>
                  <span className="font-bold text-blue-600 uppercase">{previewDoc.docType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Valid Until</span>
                  <span className="font-semibold text-slate-800">{previewDoc.expiryDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status</span>
                  <span className={previewDoc.verified ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                    {previewDoc.verified ? "Verified" : "Pending Verification"}
                  </span>
                </div>
              </div>

              {/* Document File Display */}
              <div className="border rounded-lg bg-slate-100 flex items-center justify-center p-4 min-h-[300px]">
                {hasRealFile(previewDoc.fileUrl) ? (
                  previewDoc.fileUrl.startsWith('data:image') || previewDoc.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                    <img 
                      src={previewDoc.fileUrl} 
                      alt="Document preview" 
                      className="max-h-[60vh] max-w-full object-contain rounded shadow-xs" 
                    />
                  ) : previewDoc.fileUrl.startsWith('data:application/pdf') || previewDoc.fileUrl.endsWith('.pdf') ? (
                    <iframe 
                      src={previewDoc.fileUrl} 
                      title="PDF Document" 
                      className="w-full h-[60vh] rounded border-0" 
                    />
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <FileText className="w-16 h-16 text-blue-600 mx-auto" />
                      <p className="text-sm font-semibold text-slate-800">Attached File Ready</p>
                      <a 
                        href={previewDoc.fileUrl} 
                        download={`document_${previewDoc.docType}_${previewDoc.ownerName}`}
                        target="_blank" 
                        rel="noreferrer"
                      >
                        <Button size="sm" className="bg-blue-600">
                          <Download className="w-4 h-4 mr-1.5" /> Download File
                        </Button>
                      </a>
                    </div>
                  )
                ) : (
                  <div className="text-center p-8 text-slate-400 text-xs">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    No scanned file attachment was uploaded for this record yet.
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                {hasRealFile(previewDoc.fileUrl) && (
                  <a href={previewDoc.fileUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="text-xs">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open in New Tab
                    </Button>
                  </a>
                )}
                <Button className="bg-blue-600 ml-auto" onClick={() => setPreviewDoc(null)}>
                  Close Viewer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Renew Modal Dialog */}
      {renewDoc && (
        <Dialog open={!!renewDoc} onOpenChange={() => { setRenewDoc(null); setRenewFile(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Renew {renewDoc.docType.toUpperCase()}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              renewMutation.mutate({ 
                id: renewDoc.id, 
                expiryDate: newExpiry,
                fileUrl: renewFile?.dataUrl
              }); 
            }} className="space-y-4 pt-1">
              <p className="text-xs text-slate-500">
                Renewing document for <strong className="text-slate-800">{renewDoc.ownerName}</strong>. 
                Previous history is preserved.
              </p>

              <div className="space-y-1">
                <Label className="text-xs">New Expiry Date</Label>
                <Input type="date" required value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Upload New Scanned Copy / Photo</Label>
                <Input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, true)}
                  className="text-xs" 
                />
                {renewFile && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    ✓ Selected: {renewFile.name}
                  </p>
                )}
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