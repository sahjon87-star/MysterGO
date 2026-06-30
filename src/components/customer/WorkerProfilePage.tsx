import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { ArrowLeft, Star, ShieldCheck, MessageCircle, Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { ProviderProfile, Review } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const WorkerProfilePage: React.FC = () => {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [worker, setWorker] = useState<ProviderProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    applicationFeeRate: 5,
    paymentChargeRate: 2
  });

  useEffect(() => {
    // Listen for global settings
    const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
      if (!snap.empty) {
        const mainSettings = snap.docs.find(d => d.data().applicationFeeRate !== undefined || d.data().commissionRate !== undefined);
        if (mainSettings) {
          const data = mainSettings.data();
          setSettings({
            applicationFeeRate: data.applicationFeeRate || data.commissionRate || 5,
            paymentChargeRate: data.paymentChargeRate || 2
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'settings');
    });

    const fetchWorker = async () => {
      if (!workerId) return;
      try {
        const snap = await getDoc(doc(db, 'providers', workerId));
        if (snap.exists()) {
          setWorker({ uid: snap.id, ...snap.data() } as ProviderProfile);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();

    // Fetch Reviews
    const q = query(
      collection(db, 'reviews'),
      where('providerId', '==', workerId),
      limit(20)
    );
    const unsubReviews = onSnapshot(q, (snap) => {
      const reviewData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      // Sort client-side to avoid index requirement
      reviewData.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setReviews(reviewData.slice(0, 5));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });

    return () => {
      unsubSettings();
      unsubReviews();
    };
  }, [workerId]);

  const calculateMarkupPrice = (basePrice: number) => {
    const markup = basePrice * (1 + (settings.applicationFeeRate + settings.paymentChargeRate) / 100);
    return Math.round(markup);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!worker) return <div className="min-h-screen flex items-center justify-center">Worker not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      {/* Hero */}
      <div className="bg-brand-dark px-4 pt-6 pb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <button onClick={() => navigate(-1)} className="relative z-10 p-2 bg-white/10 hover:bg-white/20 text-cream rounded-full transition-all mb-6">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative z-10 flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-primary-blue/20 border-2 border-primary-blue/30 flex items-center justify-center overflow-hidden shadow-2xl">
            {worker.photoURL ? (
              <img 
                src={worker.photoURL} 
                className="w-full h-full object-cover" 
                alt={worker.name} 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-primary-blue font-bold text-2xl">{getInitials(worker.name)}</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-cream">{worker.name}</h2>
              {worker.isVerified && <ShieldCheck className="w-5 h-5 text-primary-blue fill-primary-blue/20" />}
            </div>
            <p className="text-gray-teal text-sm font-bold uppercase tracking-wider">{worker.skill || worker.providerType} • Dhaka</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-primary-blue/20 px-2 py-0.5 rounded-lg border border-primary-blue/30">
                <Star className="w-3 h-3 fill-primary-blue text-primary-blue" />
                <span className="text-[10px] font-black text-primary-blue">{(worker.rating || 0).toFixed(1)}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-teal uppercase tracking-widest">{worker.totalJobs} Jobs Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 -mt-6 relative z-20">
        <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] shadow-xl shadow-slate-200 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 p-6 grid grid-cols-3 gap-4">
          <div className="text-center space-y-1 border-r border-slate-100 dark:border-slate-800">
            <div className="text-lg font-black text-cream dark:text-cream">{(worker.rating || 0).toFixed(1)}</div>
            <div className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-tighter">Rating</div>
          </div>
          <div className="text-center space-y-1 border-r border-slate-100 dark:border-slate-800">
            <div className="text-lg font-black text-cream dark:text-cream">{worker.experience}+</div>
            <div className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-tighter">Years Exp</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-lg font-black text-primary-blue">98%</div>
            <div className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-tighter">Success</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8 space-y-8">
        <div className="space-y-3">
          <h3 className="font-black text-cream dark:text-cream uppercase tracking-tight text-sm">About</h3>
          <p className="text-slate-600 dark:text-gray-teal text-sm leading-relaxed">{worker.bio || "No bio provided."}</p>
        </div>

        <div className="space-y-4">
          <h3 className="font-black text-cream dark:text-cream uppercase tracking-tight text-sm">Pricing & Work Type</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-brand-slate dark:bg-brand-dark rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-2xl font-black text-primary-blue">{formatCurrency(calculateMarkupPrice(worker.hourlyRate))}</div>
                <div className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest text-xs">Standard Hourly Rate</div>
              </div>
              <div className="bg-primary-blue/10 text-primary-blue px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Hourly</div>
            </div>

            {worker.dailyRate && (
              <div className="bg-brand-slate dark:bg-brand-dark rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-2xl font-black text-primary-blue">{formatCurrency(calculateMarkupPrice(worker.dailyRate))}</div>
                  <div className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest text-xs">Full Day (8 Hours)</div>
                </div>
                <div className="bg-primary-blue/10 dark:bg-primary-blue/20 text-primary-blue dark:text-primary-blue px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Daily Wage</div>
              </div>
            )}

            <div className="bg-brand-dark dark:bg-brand-dark rounded-3xl p-5 border border-slate-800 dark:border-slate-800 shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-black text-cream uppercase tracking-widest">
                  {worker.preferredJobType === 'daily' ? 'Preferred: Daily Wage' : 'Preferred: Contract Base'}
                </div>
                <p className="text-[10px] text-gray-teal dark:text-slate-600 font-medium">Worker's preferred way of working</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-primary-blue" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-cream dark:text-cream uppercase tracking-tight text-sm">Reviews ({worker.reviewCount || 0})</h3>
            <button className="text-[10px] font-bold text-primary-blue uppercase tracking-widest flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="bg-brand-slate dark:bg-brand-dark rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-brand-surface flex items-center justify-center text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase">
                        {getInitials(review.customerName)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-cream dark:text-cream">{review.customerName}</div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              className={`w-2.5 h-2.5 ${s <= review.rating ? 'fill-action-orange text-action-orange' : 'text-cream dark:text-cream'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase">
                      {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-gray-teal dark:text-gray-teal leading-relaxed italic">"{review.comment}"</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-brand-slate dark:bg-brand-dark rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-gray-teal dark:text-gray-teal font-bold uppercase tracking-widest">No reviews yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating CTA */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 p-4 pb-8 flex gap-4 z-50">
        <button 
          onClick={() => navigate(`/chat/${worker.uid}`)}
          className="flex-shrink-0 w-14 h-14 bg-slate-100 dark:bg-brand-surface hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-teal rounded-2xl flex items-center justify-center transition-all active:scale-95"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate(`/new-booking/${worker.uid}`)}
          className="flex-1 bg-primary-blue hover:bg-primary-blue/90 text-cream font-black py-4 rounded-2xl shadow-lg shadow-primary-blue/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Calendar className="w-5 h-5" />
          <span>BOOK NOW</span>
        </button>
      </div>
    </div>
  );
};
