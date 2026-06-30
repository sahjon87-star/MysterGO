import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ShieldCheck, 
  Upload, 
  ChevronLeft, 
  Loader2, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Camera,
  Store,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { uploadDocumentToStorage } from '../../services/storageService';

export const ShopKYC: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tradeLicense: '',
    ownerNid: '',
    licenseImage: null as string | null,
    shopFrontImage: null as string | null,
  });

  const handleFileUpload = async (type: keyof typeof formData) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setLoading(true);
      try {
        const url = await uploadDocumentToStorage(file, profile?.uid || 'temp', type);
        setFormData(prev => ({ ...prev, [type]: url }));
        toast.success(`Photo uploaded successfully!`);
      } catch (err: any) {
        toast.error(err.message || 'Upload failed');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      // 1. Update main document
      await updateDoc(doc(db, 'shops', profile.uid), {
        kycStatus: 'pending',
      });
      
      // 2. Add to private subcollection
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'shops', profile.uid, 'private', 'kyc'), {
        tradeLicense: formData.tradeLicense,
        ownerNid: formData.ownerNid,
        licenseImageUrl: formData.licenseImage,
        shopFrontImageUrl: formData.shopFrontImage,
        submittedAt: serverTimestamp(),
      });
      
      toast.success('Merchant KYC documents submitted!');
      navigate('/profile');
    } catch (err) {
      console.error(err);
      toast.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.kycStatus === 'pending') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-action-orange/10 rounded-full flex items-center justify-center text-action-orange">
          <Loader2 className="w-12 h-12 animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Verification in Progress</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            Our merchant verification team is reviewing your trade license. Typical processing time is 24-48 Business hours.
          </p>
        </div>
        <button 
          onClick={() => navigate('/profile')}
          className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (profile?.kycStatus === 'verified' || profile?.isVerified) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-primary-blue rounded-[40px] flex items-center justify-center text-white shadow-2xl border-4 border-slate-50">
          <ShieldCheck className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-primary-blue uppercase tracking-widest">Premium Merchant</p>
          <h2 className="text-3xl font-black uppercase tracking-tight">Identity Verified</h2>
          <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">
            Your shop is verified! You now appear with a blue badge and can list unlimited products.
          </p>
        </div>
        <button 
          onClick={() => navigate('/profile')}
          className="bg-slate-900 text-white px-10 py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl"
        >
          Check My Shop
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32">
      <div className="px-4 pt-6 space-y-1">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Merchant Verification</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Required for high-volume settlements</p>
      </div>

      <div className="px-4">
        {/* Progress */}
        <div className="flex gap-2 mb-10">
           {[1, 2, 3].map((s) => (
             <div key={s} className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: step >= s ? '100%' : '0%' }}
                  className="h-full bg-primary-blue shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                />
             </div>
           ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-primary-blue/5 dark:bg-primary-blue/10 border border-primary-blue/10 rounded-[32px] p-8 space-y-4">
                 <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-primary-blue shadow-lg border border-primary-blue/10">
                    <Store className="w-7 h-7" />
                 </div>
                 <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Business Documentation</h3>
                 <p className="text-xs font-medium text-slate-500 leading-relaxed">
                   To protect our customers and maintain high standards, every merchant must provide a valid trade license.
                 </p>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Trade License No.</label>
                    <input 
                      type="text"
                      value={formData.tradeLicense}
                      onChange={(e) => setFormData(prev => ({ ...prev, tradeLicense: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold shadow-sm"
                      placeholder="e.g. TR-2024-XXXXX"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Owner NID Number</label>
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={17}
                      value={formData.ownerNid}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setFormData(prev => ({ ...prev, ownerNid: val }));
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold text-slate-900 dark:text-white shadow-sm"
                      placeholder="Enter 10/13 digit NID"
                    />
                 </div>
              </div>

              <button 
                disabled={!formData.tradeLicense || !formData.ownerNid}
                onClick={() => setStep(2)}
                className="w-full bg-slate-900 dark:bg-primary-blue text-white py-6 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-40"
              >
                Proceed to Clear Photo Uploads
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
               <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Copy of Trade License</p>
                    <div 
                      onClick={() => handleFileUpload('licenseImage')}
                      className="aspect-[4/3] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary-blue transition-all"
                    >
                      {formData.licenseImage ? <CheckCircle2 className="w-10 h-10 text-green-500" /> : <FileText className="w-10 h-10 text-slate-200" />}
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Touch to Upload HQ Image</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Shop Frontage Image (Include Board)</p>
                    <div 
                      onClick={() => handleFileUpload('shopFrontImage')}
                      className="aspect-[4/3] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary-blue transition-all"
                    >
                      {formData.shopFrontImage ? <CheckCircle2 className="w-10 h-10 text-green-500" /> : <Camera className="w-10 h-10 text-slate-200" />}
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Touch to capture Shop Front</span>
                    </div>
                  </div>
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-400">Back</button>
                  <button 
                    disabled={!formData.licenseImage || !formData.shopFrontImage}
                    onClick={() => setStep(3)}
                    className="flex-[2] bg-slate-900 dark:bg-primary-blue text-white py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl"
                  >
                    Confirm Photos
                  </button>
               </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
               <div className="bg-slate-50 dark:bg-slate-900 rounded-[40px] p-8 space-y-6 text-center border-2 border-slate-100 dark:border-slate-800 relative overflow-hidden">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 mb-2 shadow-inner">
                     <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Final Declaration</h3>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed">
                    By submitting, I confirm that all provided business information is true and that I am the authorized owner of this shop.
                  </p>
                  
                  <div className="pt-4 space-y-3">
                     <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-50">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trade License Verified</span>
                     </div>
                     <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-50">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NID Verified</span>
                     </div>
                  </div>
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-6 bg-slate-50 dark:bg-slate-800 rounded-[32px] text-[10px] font-black uppercase tracking-widest text-slate-400">Back</button>
                  <button 
                    disabled={loading}
                    onClick={handleSubmit}
                    className="flex-[2] bg-primary-blue text-white py-6 rounded-[32px] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary-blue/20 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Submit Application
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
