import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  ShieldCheck, 
  Check, 
  X, 
  ExternalLink, 
  Clock, 
  AlertCircle,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ProviderProfile } from '../../types';
import { getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const AdminProviders: React.FC = () => {
  const { profile: adminProfile } = useAuth();
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [selectedProvider, setSelectedProvider] = useState<ProviderProfile | null>(null);
  const [kycData, setKycData] = useState<any>(null);

  useEffect(() => {
    if (selectedProvider) {
      setKycData(null);
      import('firebase/firestore').then(({ getDoc, doc }) => {
        getDoc(doc(db, 'providers', selectedProvider.uid, 'private', 'kyc'))
          .then(snap => {
            if (snap.exists()) {
              setKycData(snap.data());
            } else {
              // Fallback to legacy fields if it doesn't exist
              setKycData((selectedProvider as any).kycDocuments || (selectedProvider as any).kycData || null);
            }
          })
          .catch(err => console.error("Could not fetch KYC data:", err));
      });
    }
  }, [selectedProvider]);

  useEffect(() => {
    const q = query(
      collection(db, 'providers'),
      where('kycStatus', '==', activeTab)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ProviderProfile));
      // Client-side sorting to avoid composite index requirement
      data.sort((a, b) => {
        const dateA = a.kycSubmittedAt?.seconds || 0;
        const dateB = b.kycSubmittedAt?.seconds || 0;
        return dateB - dateA;
      });
      setProviders(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'providers');
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleVerify = async (providerId: string, status: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'providers', providerId), {
        kycStatus: status,
        kycReviewedAt: serverTimestamp(),
        kycReviewedBy: adminProfile?.name || 'Admin',
        isVerified: status === 'verified'
      });
      setSelectedProvider(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-cream dark:text-cream tracking-tight">Provider Verification</h2>
        <p className="text-gray-teal dark:text-gray-teal text-xs font-bold uppercase tracking-widest">Review KYC documents</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-brand-slate dark:bg-brand-dark p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        {[
          { id: 'pending', label: 'Pending' },
          { id: 'verified', label: 'Verified' },
          { id: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-brand-dark dark:bg-primary-blue text-cream shadow-lg shadow-primary-blue/20' : 'text-gray-teal dark:text-gray-teal hover:text-slate-600 dark:hover:text-cream'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 bg-brand-slate dark:bg-brand-dark rounded-[32px] animate-pulse border border-slate-100 dark:border-slate-800" />)
        ) : providers.length === 0 ? (
          <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] p-16 text-center space-y-4 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="text-5xl opacity-20">🛡️</div>
            <div className="space-y-1">
              <h4 className="font-black uppercase tracking-tight text-sm text-cream dark:text-cream">No {activeTab} providers</h4>
              <p className="text-gray-teal dark:text-gray-teal text-[10px] font-medium">New submissions will appear here.</p>
            </div>
          </div>
        ) : (
          providers.map((provider) => (
            <motion.div 
              key={provider.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedProvider(provider)}
              className="glass-card p-5 flex items-center gap-5 hover:bg-brand-slate dark:hover:bg-brand-dark transition-all cursor-pointer group relative overflow-hidden shadow-glass"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-blue/30 group-hover:w-1.5 transition-all" />
              
              <div className="w-16 h-16 rounded-[20px] bg-brand-slate dark:bg-brand-surface border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                {provider.photoURL ? (
                  <img 
                    src={provider.photoURL} 
                    className="w-full h-full object-cover" 
                    alt="Avatar" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-gray-teal dark:text-gray-teal font-black text-xl">{getInitials(provider.name)}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-cream dark:text-cream text-base tracking-tight leading-none truncate group-hover:text-primary-blue transition-colors">
                    {provider.name || 'Provider Profile'}
                  </h4>
                  {activeTab === 'verified' && (
                    <span className="px-1.5 py-0.5 bg-primary-blue/10 text-primary-blue text-[7px] font-black rounded-full uppercase tracking-widest border border-primary-blue/10">Official</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest leading-none py-1 px-2 bg-slate-50 dark:bg-brand-surface/50 rounded-lg">
                    {provider.skill || 'General Contractor'}
                  </span>
                  <div className="flex items-center gap-1.5 text-gray-teal dark:text-gray-teal">
                    <Phone className="w-3 h-3" />
                    <span className="text-[9px] font-bold tracking-widest">{provider.phone}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 pt-1">
                  <MapPin className="w-3 h-3 text-cream dark:text-slate-600" />
                  <span className="text-[9px] font-medium text-gray-teal dark:text-gray-teal truncate max-w-[200px] italic">
                    {provider.address || 'Address not registered'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 opacity-60">
                  <Clock className="w-3 h-3 text-cream dark:text-slate-600" />
                  <span className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">
                    {provider.kycSubmittedAt?.toDate?.().toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-brand-surface flex items-center justify-center text-cream dark:text-slate-600 group-hover:text-primary-blue group-hover:bg-primary-blue/5 transition-all shadow-sm">
                  <ExternalLink className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedProvider && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-brand-slate dark:bg-brand-dark w-full max-w-md rounded-t-[40px] p-8 space-y-8 border-t border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-brand-surface flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800">
                    {selectedProvider.photoURL ? (
                      <img 
                        src={selectedProvider.photoURL} 
                        className="w-full h-full object-cover" 
                        alt="Avatar" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-gray-teal dark:text-gray-teal font-black text-sm">{getInitials(selectedProvider.name)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-cream dark:text-cream tracking-tight">{selectedProvider.name}</h3>
                    <p className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest">{selectedProvider.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedProvider(null)} className="p-2 bg-slate-50 dark:bg-brand-surface rounded-xl"><X className="w-5 h-5 text-gray-teal dark:text-gray-teal" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest px-2">NID Documents</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest text-center">Front</p>
                      <div className="h-32 bg-slate-50 dark:bg-brand-surface rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <img 
                          src={kycData?.nidFrontUrl} 
                          className="w-full h-full object-cover" 
                          alt="NID Front" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest text-center">Back</p>
                      <div className="h-32 bg-slate-50 dark:bg-brand-surface rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <img 
                          src={kycData?.nidBackUrl} 
                          className="w-full h-full object-cover" 
                          alt="NID Back" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <p className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest text-center">Selfie with NID</p>
                    <div className="h-48 bg-slate-50 dark:bg-brand-surface rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                      <img 
                        src={kycData?.selfieUrl} 
                        className="w-full h-full object-cover" 
                        alt="Selfie" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-brand-surface rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-teal dark:text-gray-teal text-[8px] font-black uppercase tracking-widest">
                    <FileText className="w-3 h-3" />
                    <span>NID Number</span>
                  </div>
                  <p className="text-sm font-black text-cream dark:text-cream tracking-widest">
                    {kycData?.nidNumber || 'Not Provided'}
                  </p>
                </div>
              </div>

              {activeTab === 'pending' && (
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleVerify(selectedProvider.uid, 'rejected')}
                    className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 dark:border-red-500/20 active:scale-95 transition-all"
                  >
                    REJECT
                  </button>
                  <button 
                    onClick={() => handleVerify(selectedProvider.uid, 'verified')}
                    className="flex-[2] bg-primary-blue hover:bg-primary-blue/90 text-cream py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-blue/20 active:scale-95 transition-all"
                  >
                    APPROVE PROVIDER
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
