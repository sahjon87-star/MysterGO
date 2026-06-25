import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Store, 
  Check, 
  X, 
  ExternalLink, 
  Clock, 
  AlertCircle,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShopProfile } from '../../types';
import { getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const AdminShops: React.FC = () => {
  const { profile: adminProfile } = useAuth();
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [selectedShop, setSelectedShop] = useState<ShopProfile | null>(null);
  const [kycData, setKycData] = useState<any>(null);

  useEffect(() => {
    if (selectedShop) {
      setKycData(null);
      import('firebase/firestore').then(({ getDoc, doc }) => {
        getDoc(doc(db, 'shops', selectedShop.uid, 'private', 'kyc'))
          .then(snap => {
            if (snap.exists()) {
              setKycData(snap.data());
            } else {
              setKycData((selectedShop as any).kycData || null);
            }
          })
          .catch(err => console.error("Could not fetch KYC data:", err));
      });
    }
  }, [selectedShop]);

  useEffect(() => {
    const q = query(
      collection(db, 'shops'),
      where('kycStatus', '==', activeTab)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ShopProfile));
      // Client-side sorting
      data.sort((a, b) => {
        const dateA = a.kycSubmittedAt?.seconds || 0;
        const dateB = b.kycSubmittedAt?.seconds || 0;
        return dateB - dateA;
      });
      setShops(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shops');
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleVerify = async (shopId: string, status: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'shops', shopId), {
        kycStatus: status,
        kycReviewedAt: serverTimestamp(),
        kycReviewedBy: adminProfile?.name || 'Admin',
        isVerified: status === 'verified'
      });
      setSelectedShop(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Merchant Verification</h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Review Shop Documents</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        {[
          { id: 'pending', label: 'Pending' },
          { id: 'verified', label: 'Verified' },
          { id: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 dark:bg-primary-blue text-white shadow-lg shadow-primary-blue/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Shop List */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-[32px] animate-pulse border border-slate-100 dark:border-slate-800" />)
        ) : shops.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-16 text-center space-y-4 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="text-5xl opacity-20">🏪</div>
            <div className="space-y-1">
              <h4 className="font-black uppercase tracking-tight text-sm text-slate-800 dark:text-white">No {activeTab} shops</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">New shop submissions will appear here.</p>
            </div>
          </div>
        ) : (
          shops.map((shop) => (
            <motion.div 
              key={shop.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedShop(shop)}
              className="glass-card p-5 flex items-center gap-5 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer group relative overflow-hidden shadow-glass"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-blue/30 group-hover:w-1.5 transition-all" />
              
              <div className="w-16 h-16 rounded-[22px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                {shop.photoURL ? (
                  <img 
                    src={shop.photoURL} 
                    className="w-full h-full object-cover" 
                    alt="Logo" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Store className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-800 dark:text-white text-base tracking-tight leading-none truncate group-hover:text-primary-blue transition-colors">
                    {shop.shopName || 'Shop Profile'}
                  </h4>
                  {activeTab === 'verified' && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-[7px] font-black rounded-full uppercase tracking-widest border border-emerald-500/10">Verified Shop</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none py-1 px-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    {shop.shopCategory || 'Marketplace'}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Phone className="w-3 h-3" />
                    <span className="text-[9px] font-bold tracking-widest">{shop.phone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-slate-50 dark:border-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate italic">
                    {shop.shopAddress || 'Physical location registered'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                 <div className="flex items-center gap-1.5 opacity-60">
                    <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                       {shop.kycSubmittedAt?.toDate?.().toLocaleDateString('en-GB')}
                    </span>
                 </div>
                 <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-primary-blue group-hover:bg-primary-blue/5 transition-all shadow-sm">
                    <ExternalLink className="w-5 h-5" />
                 </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedShop && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[40px] p-8 space-y-8 border-t border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800">
                    {selectedShop.photoURL ? (
                      <img 
                        src={selectedShop.photoURL} 
                        className="w-full h-full object-cover" 
                        alt="Logo" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Store className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{selectedShop.shopName}</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{selectedShop.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedShop(null)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl"><X className="w-5 h-5 text-slate-400 dark:text-slate-500" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Business Proof</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Trade License</p>
                      <div className="h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <img 
                          src={kycData?.licenseImageUrl} 
                          className="w-full h-full object-cover" 
                          alt="Trade License" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Shop Front</p>
                      <div className="h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <img 
                          src={kycData?.shopFrontImageUrl} 
                          className="w-full h-full object-cover" 
                          alt="Shop Front" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[8px] font-black uppercase tracking-widest">
                      <FileText className="w-3 h-3" />
                      <span>License No.</span>
                    </div>
                    <p className="text-xs font-black text-slate-800 dark:text-white truncate">
                      {kycData?.tradeLicense || 'Not Provided'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[8px] font-black uppercase tracking-widest">
                      <User className="w-3 h-3" />
                      <span>Owner NID</span>
                    </div>
                    <p className="text-xs font-black text-slate-800 dark:text-white truncate">
                      {kycData?.ownerNid || 'Not Provided'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[8px] font-black uppercase tracking-widest">
                    <MapPin className="w-3 h-3" />
                    <span>Address</span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {selectedShop.shopAddress}
                  </p>
                </div>
              </div>

              {activeTab === 'pending' && (
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleVerify(selectedShop.uid, 'rejected')}
                    className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 dark:border-red-500/20 active:scale-95 transition-all"
                  >
                    REJECT
                  </button>
                  <button 
                    onClick={() => handleVerify(selectedShop.uid, 'verified')}
                    className="flex-[2] bg-primary-blue hover:bg-primary-blue/90 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-blue/20 active:scale-95 transition-all"
                  >
                    APPROVE MERCHANT
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
