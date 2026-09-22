import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getVehicles, createVehicle, deleteVehicle, getDocuments, createDocument, getDrivers } from '@/lib/supabaseApi';
import type { Vehicle, DocumentItem, DriverProfile } from '@/types';
import { 
  Plus, Trash2, Search, Filter, Truck, FileUp, Eye, ShieldCheck, 
  AlertCircle, IndianRupee, FileText, Download, ExternalLink, Image as ImageIcon, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';

export function VehiclesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Document attachment inside vehicle modal
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [docForm, setDocForm] = useState({
    docType: 'rc' as any,
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '2028-12-31'
  });

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
    queryFn: () => getVehicles(searchTerm, statusFilter)
  });

  // Fetch all documents to display vehicle compliance status & attached docs
  const { data: allDocs = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => getDocuments()
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => getDrivers()
  });

  const addMutation = useMutation({
    mutationFn: (vehicle: Partial<Vehicle>) => createVehicle(vehicle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsAddOpen(false);
      toast.success('Vehicle registered successfully');
      setNewVehicle({ registrationNumber: '', make: '', model: '', year: 2023, type: 'truck', fuelType: 'diesel', odometerReading: 10000, status: 'active' });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to register vehicle. Please check Supabase connection and RLS policies.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSelectedVehicle(null);
      toast.success('Vehicle record archived');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete vehicle');
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: (newDoc: Partial<DocumentItem>) => createDocument(newDoc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsUploadDocOpen(false);
      setAttachedFile(null);
      toast.success('Statutory document attached to vehicle');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to attach document');
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({ name: file.name, dataUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const vehicles = data || [];

  // Filter documents for the selected vehicle
  const vehicleDocs = selectedVehicle
    ? allDocs.filter(d => 
        (d.ownerName && d.ownerName.toLowerCase() === selectedVehicle.registrationNumber.toLowerCase()) ||
        (d.ownerId && (d.ownerId === selectedVehicle.id || d.ownerId.toLowerCase() === selectedVehicle.registrationNumber.toLowerCase()))
      )
    : [];

  const hasRealFile = (url?: string) => url && url !== '#' && (url.startsWith('data:') || url.startsWith('http'));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Vehicles</h1>
          <p className="text-sm text-slate-500">Manage all registered commercial vehicles, statutory documents, fuel profiles, and driver assignments</p>
        </div>

        <div className="flex gap-2">
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
                    placeholder="e.g. KA 01 AB 1234" 
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
              <TableHead>Assigned Driver</TableHead>
              <TableHead>Documents Attached</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading vehicles...</TableCell></TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No vehicles registered yet. Click + Add Vehicle above.</TableCell></TableRow>
            ) : (
              vehicles.map(v => {
                const attachedDocs = allDocs.filter(d => 
                  (d.ownerName && d.ownerName.toLowerCase() === v.registrationNumber.toLowerCase()) ||
                  (d.ownerId && d.ownerId.toLowerCase() === v.registrationNumber.toLowerCase())
                );
                const assignedDriver = drivers.find(d => d.assignedVehicleReg === v.registrationNumber || d.id === v.assignedDriverId);

                return (
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
                      <div className="text-[11px] text-slate-500">{v.odometerReading?.toLocaleString('en-IN')} km</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {assignedDriver ? (
                        <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1 w-fit">
                          <Truck className="w-3 h-3" /> {assignedDriver.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Attached Documents Count & View trigger */}
                      <button
                        onClick={() => setSelectedVehicle(v)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{attachedDocs.length} {attachedDocs.length === 1 ? 'Document' : 'Documents'}</span>
                      </button>
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
                        className="h-8 text-xs text-blue-600 hover:bg-blue-50" 
                        onClick={() => setSelectedVehicle(v)}
                        title="View Details & Documents"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Details
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vehicle Details & Attached Documents Modal */}
      {selectedVehicle && (
        <Dialog open={!!selectedVehicle} onOpenChange={() => setSelectedVehicle(null)}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span>Vehicle: {selectedVehicle.registrationNumber}</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800">
                  {selectedVehicle.status}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-sm">
              {/* Vehicle Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Make & Model</span>
                  <span className="font-bold text-slate-800">{selectedVehicle.make} {selectedVehicle.model}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Odometer</span>
                  <span className="font-bold text-slate-800">{selectedVehicle.odometerReading?.toLocaleString()} km</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Fuel</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedVehicle.fuelType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mfg Year</span>
                  <span className="font-semibold text-slate-800">{selectedVehicle.year}</span>
                </div>
              </div>

              {/* Statutory Documents Section for this Vehicle */}
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" /> Attached Statutory Documents ({vehicleDocs.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">Registration RC, Insurance, PUC, Fitness, and Commercial Permits</p>
                  </div>

                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50 h-8"
                    onClick={() => setIsUploadDocOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Attach Document
                  </Button>
                </div>

                {vehicleDocs.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-lg border border-dashed text-center space-y-2">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-600 font-medium">No statutory documents attached to {selectedVehicle.registrationNumber} yet.</p>
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-xs"
                      onClick={() => setIsUploadDocOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Upload RC / Insurance Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicleDocs.map(doc => {
                      const hasFile = hasRealFile(doc.fileUrl);

                      return (
                        <div 
                          key={doc.id} 
                          className="p-3 bg-white border rounded-lg flex items-center justify-between hover:border-blue-300 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                {doc.docType}
                              </span>
                              <span className="text-xs font-semibold text-slate-800">
                                Valid until: <strong className="text-slate-900">{doc.expiryDate}</strong>
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Issued: {doc.issueDate} • {doc.verified ? '✓ Verified' : 'Pending Verification'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasFile ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                                onClick={() => setPreviewDoc(doc)}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> View File
                              </Button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No File Attached</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t pt-3 flex justify-end">
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

      {/* Attach Document Dialog (inside vehicle modal) */}
      {isUploadDocOpen && selectedVehicle && (
        <Dialog open={isUploadDocOpen} onOpenChange={setIsUploadDocOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Attach Document to {selectedVehicle.registrationNumber}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              uploadDocMutation.mutate({
                ownerType: 'vehicle',
                ownerId: selectedVehicle.id,
                ownerName: selectedVehicle.registrationNumber,
                docType: docForm.docType,
                issueDate: docForm.issueDate,
                expiryDate: docForm.expiryDate,
                fileUrl: attachedFile?.dataUrl || '#'
              });
            }} className="space-y-4 pt-1">
              <div className="space-y-1">
                <Label className="text-xs">Document Type</Label>
                <select 
                  className="w-full border rounded-md p-2 text-xs bg-white text-slate-800"
                  value={docForm.docType} 
                  onChange={e => setDocForm(f => ({ ...f, docType: e.target.value as any }))}
                >
                  <option value="rc">RC (Registration Certificate)</option>
                  <option value="insurance">Insurance Policy</option>
                  <option value="permit">Commercial Permit</option>
                  <option value="puc">PUC Certificate</option>
                  <option value="fitness">Fitness Certificate</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Issue Date</Label>
                  <Input type="date" required value={docForm.issueDate} onChange={e => setDocForm(f => ({ ...f, issueDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expiry Date</Label>
                  <Input type="date" required value={docForm.expiryDate} onChange={e => setDocForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Select Scanned Copy / Photo (PDF or Image)</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center bg-slate-50/50">
                  <Input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
                  />
                  {attachedFile && (
                    <p className="mt-1.5 text-xs text-emerald-700 font-medium flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> File ready: {attachedFile.name}
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={uploadDocMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
                {uploadDocMutation.isPending ? 'Attaching...' : 'Upload & Attach'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Full Document Viewer Modal */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>{previewDoc.ownerName} — {previewDoc.docType.toUpperCase()}</span>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-2 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Vehicle</span>
                  <span className="font-bold text-slate-800">{previewDoc.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Document</span>
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
                    No file attachment preview available for this document.
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
    </div>
  );
}