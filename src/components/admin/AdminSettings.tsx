import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadImage } from '../../services/imgbb';
import { 
  Settings, 
  Save, 
  Percent, 
  Phone, 
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Loader2,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  Sparkles,
  Link2
} from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    applicationFeeRate: 5,
    paymentChargeRate: 2,
    referralRewardAmount: 20,
    isReferralEnabled: true,
    minWithdrawal: 100,
    bkashNumber: '',
    nagadNumber: '',
  });
  const [docId, setDocId] = useState<string | null>(null);

  const [banners, setBanners] = useState<string[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [showDirectLinks, setShowDirectLinks] = useState(false);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'home_banners'));
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.urls)) {
            setBanners(data.urls);
          } else {
            setBanners([]);
          }
        } else {
          setBanners([]);
        }
      } catch (err) {
        console.error("Error fetching banners:", err);
      } finally {
        setBannerLoading(false);
      }
    };
    fetchBanners();
  }, []);

  const handleUpload = async (file: File, index: number) => {
    if (!file) return;
    setUploadingIndex(index);
    try {
      const downloadUrl = await uploadImage(file, `home_banner_${index}_${Date.now()}`);
      
      const updatedBanners = [...banners];
      while (updatedBanners.length <= index) {
        updatedBanners.push('');
      }
      updatedBanners[index] = downloadUrl;
      setBanners(updatedBanners);

      await setDoc(doc(db, 'settings', 'home_banners'), {
        urls: updatedBanners,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success(`Banner ${index + 1} uploaded successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleDelete = async (index: number) => {
    try {
      const updatedBanners = [...banners];
      updatedBanners[index] = '';
      setBanners(updatedBanners);

      await setDoc(doc(db, 'settings', 'home_banners'), {
        urls: updatedBanners,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success(`Banner ${index + 1} removed.`);
    } catch (err: any) {
      toast.error(`Failed to remove: ${err.message}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        await handleUpload(file, index);
      } else {
        toast.error('Only image uploads are accepted.');
      }
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'system_config'));
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            applicationFeeRate: data.applicationFeeRate || data.commissionRate || 5,
            paymentChargeRate: data.paymentChargeRate || 2,
            referralRewardAmount: data.referralRewardAmount ?? 20,
            isReferralEnabled: data.isReferralEnabled !== false,
            minWithdrawal: data.minWithdrawal || 100,
            bkashNumber: data.bkashNumber || '',
            nagadNumber: data.nagadNumber || '',
          });
          setDocId('system_config');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'system_config'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      setDocId('system_config');
      toast.success('Settings updated successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActive = async (targetUrl: string) => {
    try {
      const updatedBanners = banners.map(u => u === targetUrl ? '' : u);
      setBanners(updatedBanners);

      await setDoc(doc(db, 'settings', 'home_banners'), {
        urls: updatedBanners,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success('Banner removed.');
    } catch (err: any) {
      toast.error(`Failed to remove: ${err.message}`);
    }
  };

  const handleUploadNew = async (file: File) => {
    if (!file) return;
    
    // Find first empty slot (either empty string or index >= length)
    let targetIdx = -1;
    for (let i = 0; i < 4; i++) {
      if (!banners[i] || banners[i].trim() === '') {
        targetIdx = i;
        break;
      }
    }
    
    // If no empty slots, append if banners has fewer than 4 items overall
    if (targetIdx === -1) {
      if (banners.length < 4) {
        targetIdx = banners.length;
      } else {
        toast.error("Maximum 4 banners allowed. Delete one before uploading.");
        return;
      }
    }

    setUploadingIndex(targetIdx);
    try {
      const downloadUrl = await uploadImage(file, `home_banner_${targetIdx}_${Date.now()}`);
      
      const updatedBanners = [...banners];
      while (updatedBanners.length <= targetIdx) {
        updatedBanners.push('');
      }
      updatedBanners[targetIdx] = downloadUrl;
      setBanners(updatedBanners);

      await setDoc(doc(db, 'settings', 'home_banners'), {
        urls: updatedBanners,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success('Banner uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingIndex(null);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse text-sm font-black text-slate-400">Loading settings...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase">Platform Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Global configuration & rules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Financial Settings, Gateway Numbers, and Referral Program */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          
          {/* Financial Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <Percent className="w-4 h-4 text-primary-blue shrink-0" />
              <h3 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Financial Settings</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Application Fee</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={settings.applicationFeeRate}
                    onChange={(e) => setSettings({ ...settings, applicationFeeRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-primary-blue outline-none text-slate-800 dark:text-white"
                    placeholder="5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400 dark:text-slate-500">%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Payment Charges</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={settings.paymentChargeRate}
                    onChange={(e) => setSettings({ ...settings, paymentChargeRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-primary-blue outline-none text-slate-800 dark:text-white"
                    placeholder="2"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400 dark:text-slate-500">%</span>
                </div>
              </div>
            </div>
            
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium px-1">
              Markup percentages applied to the worker's base price when booking.
            </p>
          </div>

          <div className="h-px bg-slate-50 dark:bg-slate-800/60" />

          {/* Gateway Numbers Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <Phone className="w-4 h-4 text-primary-blue shrink-0" />
              <h3 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Gateway Numbers</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">bKash Number</label>
                <input 
                  type="text" 
                  value={settings.bkashNumber}
                  onChange={(e) => setSettings({ ...settings, bkashNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary-blue outline-none text-slate-800 dark:text-white"
                  placeholder="017XXXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Nagad Number</label>
                <input 
                  type="text" 
                  value={settings.nagadNumber}
                  onChange={(e) => setSettings({ ...settings, nagadNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary-blue outline-none text-slate-800 dark:text-white"
                  placeholder="018XXXXXXXX"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-50 dark:bg-slate-800/60" />

          {/* Referral Program Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary-blue shrink-0" />
                <h3 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Referral Program</h3>
              </div>
              <button 
                type="button"
                onClick={() => setSettings({ ...settings, isReferralEnabled: !settings.isReferralEnabled })}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${settings.isReferralEnabled ? 'bg-green-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
              >
                {settings.isReferralEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Reward Amount (৳)</label>
                <input 
                  type="number" 
                  value={settings.referralRewardAmount}
                  onChange={(e) => setSettings({ ...settings, referralRewardAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary-blue outline-none text-slate-800 dark:text-white"
                  placeholder="20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Min. Withdrawal (৳)</label>
                <input 
                  type="number" 
                  value={settings.minWithdrawal}
                  onChange={(e) => setSettings({ ...settings, minWithdrawal: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary-blue outline-none text-slate-800 dark:text-white"
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          {/* Notice Banner */}
          <div className="bg-action-orange/10 dark:bg-action-orange/20 border border-action-orange/20 dark:border-action-orange/30 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-action-orange shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-black text-action-orange uppercase tracking-wider">Important Notice</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                App fee configuration is saved globally. Changes apply only to subsequent orders.
              </p>
            </div>
          </div>

          {/* Unified Save Button */}
          <button 
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-slate-900 dark:bg-primary-blue hover:bg-slate-800 dark:hover:bg-primary-blue/90 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-md shadow-slate-900/10 dark:shadow-primary-blue/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin animate-none" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'SAVING...' : 'SAVE ALL SETTINGS'}</span>
          </button>
        </div>

        {/* Right Side: Banner Image Slider / Media Uploads */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-blue/10 dark:bg-primary-blue/20 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary-blue" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">Banner Image Slider</h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Home Page Carousel (3 to 4 active slides)</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            Manage your layout banner slides. These loop automatically on the Customer App. Delete slides to clear, or upload files directly.
          </p>

          {bannerLoading ? (
            <div className="py-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-blue" /> Loading Slider Configuration...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Box Grid Layout for Uploaded Banners */}
              <div className="flex flex-wrap gap-3.5 items-center">
                {banners.filter(u => typeof u === 'string' && u.trim() !== '').map((url, idx) => {
                  const globalIdx = banners.indexOf(url);
                  return (
                    <div 
                      key={url + '-' + idx}
                      className="relative w-[110px] h-[110px] rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-950 flex items-center justify-center group"
                    >
                      <img 
                        src={url} 
                        alt={`Banner Slot`} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        referrerPolicy="no-referrer" 
                      />
                      
                      {/* X/Delete Button Badge absolutely positioned on top */}
                      <button 
                        type="button"
                        onClick={() => handleDelete(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-md transform hover:scale-110 active:scale-95 transition-all z-10 animate-none"
                        title="Delete Image"
                      >
                        <Plus className="w-3.5 h-3.5 rotate-45" />
                      </button>

                      {/* Display Slot Identifier Tag */}
                      <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-widest select-none z-10">
                        Slot {globalIdx !== -1 ? globalIdx + 1 : idx + 1}
                      </div>
                    </div>
                  );
                })}

                {/* Upload New dashed Box */}
                {banners.filter(u => typeof u === 'string' && u.trim() !== '').length < 4 && (
                  <label className="relative w-[110px] h-[110px] border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary-blue/50 hover:bg-primary-blue/5 dark:hover:bg-primary-blue/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/20 active:scale-95">
                    {uploadingIndex !== null ? (
                      <div className="flex flex-col items-center gap-1">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-blue" />
                        <span className="text-[7px] font-black text-primary-blue uppercase tracking-widest">UPLOADING</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-center px-1">
                        <Plus className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Upload New</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadNew(e.target.files[0]);
                        }
                      }}
                      className="hidden" 
                      disabled={uploadingIndex !== null}
                    />
                  </label>
                )}
              </div>

              {/* Advanced direct image link configuration option */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDirectLinks(!showDirectLinks)}
                  className="text-[10px] font-black text-primary-blue hover:underline uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {showDirectLinks ? 'Hide Direct Links' : 'Configure Direct Links (Advanced)'}
                </button>

                {showDirectLinks && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Direct Links for each Slot</p>
                    {[0, 1, 2, 3].map((idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 w-12 shrink-0">Slot {idx + 1}:</span>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/etc..."
                          value={banners[idx] || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            const updatedBanners = [...banners];
                            while (updatedBanners.length <= idx) {
                              updatedBanners.push('');
                            }
                            updatedBanners[idx] = val;
                            setBanners(updatedBanners);
                            await setDoc(doc(db, 'settings', 'home_banners'), {
                              urls: updatedBanners,
                              updatedAt: serverTimestamp()
                            }, { merge: true });
                          }}
                          className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary-blue text-slate-800 dark:text-cream placeholder:text-slate-400 text-ellipsis"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
