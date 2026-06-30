import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'motion/react';
import { Megaphone, Save, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const AdminOffers: React.FC = () => {
  const [offer, setOffer] = useState({
    text: '৳100 off your first booking! Special offer for new users. Limited time only.',
    isActive: true,
    backgroundColor: '#1A438D', // primary-blue
    textColor: '#ffffff'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'promotions'), (snap) => {
      if (snap.exists()) {
        setOffer(snap.data() as any);
      }
      setLoading(false);
    }, (error) => {
      console.warn('AdminOffers promotions settings listener error:', error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'promotions'), offer);
      toast.success('Offer updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update offer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-cream dark:text-cream tracking-tight">Promotional Offers</h2>
        <p className="text-gray-teal dark:text-gray-teal text-xs font-bold uppercase tracking-widest">Manage scrolling banners and home page offers</p>
      </div>

      <div className="grid gap-6">
        {/* Preview Card */}
        <div className="bg-brand-slate dark:bg-brand-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-cream dark:text-cream uppercase tracking-tight">Live Preview</h3>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${offer.isActive ? 'bg-primary-blue/10 text-primary-blue' : 'bg-slate-100 text-gray-teal'}`}>
              {offer.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <div 
            className="rounded-2xl p-4 overflow-hidden whitespace-nowrap relative"
            style={{ backgroundColor: offer.backgroundColor, color: offer.textColor }}
          >
            <motion.div 
              animate={{ x: [0, -500] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="inline-block font-black text-xs uppercase tracking-widest"
            >
              {offer.text} &nbsp;&nbsp;&nbsp; {offer.text}
            </motion.div>
          </div>
        </div>

        {/* Editor Card */}
        <div className="bg-brand-slate dark:bg-brand-dark p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest ml-1">Offer Text</label>
              <textarea 
                value={offer.text}
                onChange={(e) => setOffer(prev => ({ ...prev, text: e.target.value }))}
                className="w-full p-4 bg-slate-50 dark:bg-brand-surface border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue transition-all text-sm font-medium dark:text-cream min-h-[100px]"
                placeholder="Enter offer text..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest ml-1">Background Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={offer.backgroundColor}
                    onChange={(e) => setOffer(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer overflow-hidden border-none p-0"
                  />
                  <input 
                    type="text" 
                    value={offer.backgroundColor}
                    onChange={(e) => setOffer(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="flex-1 px-3 bg-slate-50 dark:bg-brand-surface border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest ml-1">Text Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={offer.textColor}
                    onChange={(e) => setOffer(prev => ({ ...prev, textColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer overflow-hidden border-none p-0"
                  />
                  <input 
                    type="text" 
                    value={offer.textColor}
                    onChange={(e) => setOffer(prev => ({ ...prev, textColor: e.target.value }))}
                    className="flex-1 px-3 bg-slate-50 dark:bg-brand-surface border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-brand-surface rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${offer.isActive ? 'bg-primary-blue text-cream' : 'bg-slate-200 text-gray-teal'}`}>
                  {offer.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-black text-cream dark:text-cream uppercase tracking-tight">Visibility</p>
                  <p className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest">Show or hide on home page</p>
                </div>
              </div>
              <button 
                onClick={() => setOffer(prev => ({ ...prev, isActive: !prev.isActive }))}
                className={`w-12 h-6 rounded-full transition-all relative ${offer.isActive ? 'bg-primary-blue' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-brand-slate rounded-full transition-all ${offer.isActive ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-brand-dark dark:bg-primary-blue text-cream py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
