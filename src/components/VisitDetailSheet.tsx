import React, { useRef, useState, useCallback } from 'react';
import { Camera, MapPin, UploadCloud, X, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { FieldVisit, FieldVisitStatus, Language } from '../types';
import { getCurrentLocationSafe } from '../lib/utils/location-utils';

interface VisitDetailSheetProps {
  language: Language;
  visit: FieldVisit;
  onClose: () => void;
  onUpdateStatus: (visitId: string, status: FieldVisitStatus, photoData?: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
}

export default function VisitDetailSheet({ language, visit, onClose, onUpdateStatus }: VisitDetailSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // For Completion Proof
  const [notes, setNotes] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(visit.proofPhotoUrl || null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setPhotoData(canvas.toDataURL('image/jpeg', 0.8));
    stopCamera();
  };

  const handleAction = async (newStatus: FieldVisitStatus) => {
    setLoading(true);
    setError(null);
    
    // Require photo for completion if we want to enforce it.
    if (newStatus === 'COMPLETED' && !photoData) {
      setError('Photo proof is required to complete this visit.');
      setLoading(false);
      return;
    }

    const result = await onUpdateStatus(
      visit.id, 
      newStatus, 
      newStatus === 'COMPLETED' ? (photoData || undefined) : undefined, 
      newStatus === 'COMPLETED' ? notes : undefined
    );
    
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Failed to update status');
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: FieldVisitStatus) => {
    const map: Record<string, string> = {
      'ASSIGNED': 'bg-slate-100 text-slate-600',
      'EN_ROUTE': 'bg-blue-50 text-blue-600',
      'ARRIVED': 'bg-orange-50 text-orange-600',
      'IN_PROGRESS': 'bg-amber-50 text-amber-600',
      'COMPLETED': 'bg-teal-50 text-teal-600',
      'MISSED': 'bg-rose-50 text-rose-600',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="font-black text-slate-800 text-lg">{visit.title}</h2>
            <p className="text-xs font-bold text-slate-400">{visit.visitType.replace('_', ' ')}</p>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${getStatusBadge(visit.status)}`}>
              {visit.status}
            </span>
            {visit.locationException && (
              <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                <AlertTriangle className="w-3 h-3" /> Exception
              </span>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
            {visit.patientName && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient / Client</p>
                <p className="text-sm font-bold text-slate-700">{visit.patientName}</p>
              </div>
            )}
            {visit.assignedAddress && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location
                </p>
                <p className="text-sm font-bold text-slate-700">{visit.assignedAddress}</p>
              </div>
            )}
            {visit.description && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details</p>
                <p className="text-sm text-slate-600 mt-1">{visit.description}</p>
              </div>
            )}
          </div>

          {/* Proof Capture UI (only show if arrived/in_progress or already completed) */}
          {(visit.status === 'ARRIVED' || visit.status === 'IN_PROGRESS' || visit.status === 'COMPLETED') && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <h3 className="font-bold text-sm text-slate-800">Visit Proof</h3>
              
              {/* Photo Area */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 min-h-[200px] overflow-hidden relative">
                {photoData ? (
                  <img src={photoData} alt="Proof" className="w-full h-full object-cover absolute inset-0" />
                ) : stream ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover absolute inset-0" />
                    <button onClick={capturePhoto} className="absolute bottom-4 bg-white text-teal-600 px-6 py-2 rounded-full font-bold shadow-lg z-10 flex items-center gap-2">
                      <Camera className="w-5 h-5" /> Capture
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium mb-3">Photo proof is required</p>
                    {visit.status !== 'COMPLETED' && (
                      <button onClick={startCamera} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors">
                        Open Camera
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Notes Area */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Completion Notes</label>
                <textarea
                  disabled={visit.status === 'COMPLETED'}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm p-3 focus:ring-teal-500 disabled:opacity-70"
                  rows={3}
                  placeholder="Any notes about the visit..."
                  value={visit.status === 'COMPLETED' ? visit.completionNotes || '' : notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions based on status */}
        <div className="p-6 bg-white border-t border-slate-100">
          {visit.status === 'ASSIGNED' && (
            <button 
              onClick={() => handleAction('EN_ROUTE')} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Processing...' : 'Start Trip (En Route)'}
            </button>
          )}
          
          {visit.status === 'EN_ROUTE' && (
            <button 
              onClick={() => handleAction('ARRIVED')} disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-orange-600/20"
            >
              {loading ? 'Processing...' : 'I Have Arrived'}
            </button>
          )}
          
          {(visit.status === 'ARRIVED' || visit.status === 'IN_PROGRESS') && (
            <button 
              onClick={() => handleAction('COMPLETED')} disabled={loading || !photoData}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-teal-600/20 flex justify-center items-center gap-2"
            >
              {loading ? 'Completing...' : <><CheckCircle2 className="w-5 h-5" /> Complete Visit</>}
            </button>
          )}

          {visit.status === 'COMPLETED' && (
            <div className="w-full bg-teal-50 text-teal-600 py-4 rounded-xl font-bold text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Visit Completed
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
