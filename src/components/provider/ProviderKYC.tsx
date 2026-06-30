import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ShieldCheck, Upload, ChevronLeft, Loader2, Info, CheckCircle2, AlertCircle, FileText, Camera, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { uploadDocumentToStorage } from '../../services/storageService';

export const ProviderKYC: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nidNumber: '',
    nidFront: null as string | null,
    nidBack: null as string | null,
    selfieWithNid: null as string | null,
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
      // 1. Update main document with status
      await updateDoc(doc(db, 'providers', profile.uid), {
        kycStatus: 'pending',
      });
      
      // 2. Save private data to subcollection
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'providers', profile.uid, 'private', 'kyc'), {
        nidNumber: formData.nidNumber,
        nidFrontUrl: formData.nidFront,
        nidBackUrl: formData.nidBack,
        selfieUrl: formData.selfieWithNid,
        submittedAt: serverTimestamp(),
      });
      
      toast.success('KYC documents submitted for review!');
      navigate('/profile');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit documents');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.kycStatus === 'pending') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-action-orange/10 rounded-[40px] flex items-center justify-center text-action-orange shadow-inner">
          <Loader2 className="w-12 h-12 animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Verification in Progress</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            Our team is reviewing your documents. This usually takes 12-24 hours. You will be notified once verified.
          </p>
        </div>
        <button 
          onClick={() => navigate('/profile')}
          className="bg-slate-900 dark:bg-slate-800 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (profile?.kycStatus === 'verified' || profile?.isVerified) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-6 text-white bg-slate-900 rounded-b-[40px] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="w-24 h-24 bg-primary-blue rounded-[40px] flex items-center justify-center text-white shadow-2xl relative z-10 border-4 border-white/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-2 relative z-10">
          <h2 className="text-3xl font-black uppercase tracking-tight">Verified Professional</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            Congratulations! Your identity has been verified. You now have full access to all high-paying jobs.
          </p>
        </div>
        <button 
          onClick={() => navigate('/profile')}
          className="bg-white text-slate-900 px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all relative z-10"
        >
          Check Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32">
      <div className="px-4 pt-6 space-y-1">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">KYC Verification</h2>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">Protecting our platform community</p>
      </div>

      <div className="px-4">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
           {[1, 2, 3].map((s) => (
             <div key={s} className={`h-1.5 flex-1 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: step >= s ? '100%' : '0%' }}
                  className="h-full bg-primary-blue"
                />
             </div>
           ))}
        </div>

        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="bg-primary-blue/5 dark:bg-primary-blue/10 border border-primary-blue/20 rounded-[32px] p-6 space-y-4">
              <div className="w-12 h-12 bg-primary-blue rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-tight">National ID Verification</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                We need to verify your National Identity to ensure you are a genuine professional in our network.
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">NID Card Number</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-blue transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={17}
                  value={formData.nidNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData(prev => ({ ...prev, nidNumber: val }));
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] pl-14 pr-6 py-5 focus:ring-2 focus:ring-primary-blue outline-none text-sm font-black text-slate-900 dark:text-white shadow-sm"
                  placeholder="Enter 10 or 13 digit NID number"
                />
              </div>
            </div>

            <button 
              disabled={!formData.nidNumber}
              onClick={() => setStep(2)}
              className="w-full bg-slate-900 dark:bg-primary-blue text-white py-6 rounded-[28px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
            >
              Continue to Uploads
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="grid gap-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">NID Front Side</p>
                <div 
                  onClick={() => handleFileUpload('nidFront')}
                  className="aspect-[1.6/1] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary-blue transition-all"
                >
                  {formData.nidFront ? <CheckCircle2 className="w-10 h-10 text-green-500" /> : <Camera className="w-10 h-10 text-slate-200" />}
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Click to Capture</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">NID Back Side</p>
                <div 
                  onClick={() => handleFileUpload('nidBack')}
                  className="aspect-[1.6/1] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary-blue transition-all"
                >
                  {formData.nidBack ? <CheckCircle2 className="w-10 h-10 text-green-500" /> : <Camera className="w-10 h-10 text-slate-200" />}
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Click to Capture</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 rounded-[28px] text-[10px] font-black uppercase tracking-widest text-slate-400">Back</button>
              <button 
                disabled={!formData.nidFront || !formData.nidBack}
                onClick={() => setStep(3)}
                className="flex-[2] bg-slate-900 dark:bg-primary-blue text-white py-6 rounded-[28px] text-[10px] font-black uppercase tracking-widest"
              >
                Next Step
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
             <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Selfie with NID Card</p>
                <div 
                  onClick={() => handleFileUpload('selfieWithNid')}
                  className="aspect-square bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary-blue transition-all relative overflow-hidden"
                >
                   <div className="text-center p-8 space-y-4">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-200">
                        <User className="w-10 h-10" />
                      </div>
                      <p className="text-xs font-medium text-slate-400 leading-relaxed">
                        Hold your NID card next to your face and take a clear photo.
                      </p>
                   </div>
                   {formData.selfieWithNid && (
                     <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center backdrop-blur-[2px]">
                       <div className="bg-white rounded-full p-4 shadow-xl">
                          <CheckCircle2 className="w-10 h-10 text-green-500" />
                       </div>
                     </div>
                   )}
                </div>
             </div>

             <div className="space-y-4 pt-4">
                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 rounded-[28px] text-[10px] font-black uppercase tracking-widest text-slate-400">Back</button>
                  <button 
                    disabled={!formData.selfieWithNid || loading}
                    onClick={handleSubmit}
                    className="flex-[2] bg-primary-blue text-white py-6 rounded-[28px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-blue/20 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Confirm & Submit
                  </button>
                </div>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
