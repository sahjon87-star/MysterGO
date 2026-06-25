import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Gift, ChevronRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

export const ReferralBanner: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    referralRewardAmount: 20,
    isReferralEnabled: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'system_config'));
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            referralRewardAmount: data.referralRewardAmount ?? 20,
            isReferralEnabled: data.isReferralEnabled !== false
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading || !settings.isReferralEnabled) return null;

  return (
    <section className="px-4">
      <div 
        onClick={() => navigate('/referral')}
        className="bg-brand-amber rounded-[32px] p-6 text-brand-dark relative overflow-hidden shadow-2xl cursor-pointer active:scale-[0.98] transition-all border border-brand-amber/20"
      >
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-brand-dark" />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-dark/60">Referral Pulse</span>
            </div>
            <h3 className="text-xl font-black leading-tight truncate tracking-tighter uppercase">Reward Node: ৳{settings.referralRewardAmount}</h3>
            <p className="text-[9px] font-bold text-brand-dark/80 uppercase tracking-[0.2em]">Scale the Network - Invite Friends</p>
          </div>
          <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <ChevronRight className="w-6 h-6 text-brand-amber" />
          </div>
        </div>
      </div>
    </section>
  );
};
