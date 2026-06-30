import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Star, 
  Store, 
  ShieldCheck, 
  Award, 
  ChevronRight, 
  ChevronLeft,
  Settings,
  Share2,
  Trash2,
  Camera,
  History,
  TrendingUp,
  Package,
  ShoppingBag,
  Bell,
  Globe,
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const ShopProfile: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    completedOrders: 0,
    totalSales: 0,
    activeProducts: 0,
    recognition: 'Trusted Seller'
  });

  useEffect(() => {
    if (!profile?.uid) return;

    const fetchStats = async () => {
      try {
        const ordersQ = query(
          collection(db, 'orders'),
          where('shopId', '==', profile.uid),
          where('status', '==', 'delivered')
        );
        const ordersSnap = await getDocs(ordersQ);
        const completed = ordersSnap.docs.length;
        
        let sales = 0;
        ordersSnap.docs.forEach(doc => {
          sales += doc.data().totalAmount || 0;
        });

        const productsQ = query(
          collection(db, 'products'),
          where('shopId', '==', profile.uid)
        );
        const productsSnap = await getDocs(productsQ);
        const productsCount = productsSnap.docs.length;

        setStats({
          completedOrders: completed,
          totalSales: sales,
          activeProducts: productsCount,
          recognition: completed > 100 ? 'Platinum Merchant' : completed > 25 ? 'Gold Merchant' : 'Verified Shop'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'shop_stats');
      }
    };

    fetchStats();
  }, [profile?.uid]);

  const menuGroups = [
    {
      title: 'Business Performance',
      items: [
        { icon: TrendingUp, label: 'Sales Insights', path: '/merchant/insights', color: 'text-primary-blue bg-primary-blue/10' },
        { icon: ShoppingBag, label: 'Order History', path: '/merchant/orders', color: 'text-action-orange bg-action-orange/10' },
        { icon: Star, label: 'Customer Reviews', path: '/merchant/reviews', color: 'text-primary-blue bg-primary-blue/10' },
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: Package, label: 'Manage Inventory', path: '/merchant/inventory', color: 'text-green-500 bg-green-500/10' },
        { icon: Bell, label: 'Store Notifications', path: '/merchant/notifications', color: 'text-gray-teal bg-slate-100 dark:bg-brand-surface' },
      ]
    },
    {
      title: 'Verification & Safety',
      items: [
        { icon: ShieldCheck, label: 'Shop Verification', path: '/merchant/kyc', color: 'text-primary-blue bg-primary-blue/10', sub: profile?.isVerified ? 'Verified' : 'Required' },
        { icon: Lock, label: 'Privacy Settings', path: '/merchant/settings', color: 'text-gray-teal bg-slate-100 dark:bg-brand-surface' },
      ]
    },
    {
      title: 'Shop settings',
      items: [
        { icon: Globe, label: 'App Language', path: '/settings', color: 'text-gray-teal bg-slate-100 dark:bg-brand-surface' },
        { icon: Settings, label: 'General Settings', path: '/settings', color: 'text-gray-teal bg-slate-100 dark:bg-brand-surface' },
        { icon: Share2, label: 'Share Shop ID', onClick: () => {
          if (navigator.share) {
            navigator.share({
              title: profile?.shopName || 'MistriGO Shop',
              text: `Visit our shop on MistriGO! Shop ID: ${profile?.uid}`,
              url: window.location.href
            }).catch(console.error);
          }
        }, color: 'text-gray-teal bg-slate-100 dark:bg-brand-surface' },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-32">
      {/* Shop Header */}
      <div className="bg-brand-dark pt-12 pb-24 relative overflow-hidden transition-colors border-b border-primary-blue/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative group">
            <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-[40px] border-4 border-white/10 shadow-2xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95 cursor-pointer">
              {profile?.photoURL ? (
                <img src={profile.photoURL} className="w-full h-full object-cover" alt="Shop" />
              ) : (
                <Store className="w-12 h-12 text-cream/40" />
              )}
            </div>
            <button className="absolute bottom-1 right-1 w-10 h-10 bg-primary-blue text-cream rounded-2xl shadow-xl flex items-center justify-center border-4 border-brand-dark transition-transform active:scale-90">
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 text-center space-y-1 px-6">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-black text-cream tracking-tight uppercase">{profile?.shopName || profile?.name}</h2>
              {profile?.isVerified && <ShieldCheck className="w-5 h-5 text-primary-blue" />}
            </div>
            <p className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em]">{profile?.shopCategory || 'Hardware & Tools'}</p>
            <div className="flex items-center justify-center gap-1.5 text-primary-blue mt-2 bg-primary-blue/10 px-4 py-1.5 rounded-full border border-primary-blue/20">
              <Award className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">{stats.recognition}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="px-4 -mt-16 relative z-20">
        <div className="bg-brand-slate dark:bg-brand-dark rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl p-8 grid grid-cols-3 gap-4">
          <div className="text-center space-y-1 border-r border-slate-50 dark:border-slate-800">
            <div className="text-xl font-black text-cream dark:text-cream leading-none">{profile?.rating?.toFixed(1) || '0.0'}</div>
            <div className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">Rating</div>
          </div>
          <div className="text-center space-y-1 border-r border-slate-50 dark:border-slate-800">
            <div className="text-xl font-black text-cream dark:text-cream leading-none">{stats.completedOrders}</div>
            <div className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">Orders</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-xl font-black text-cream dark:text-cream leading-none">{stats.activeProducts}</div>
            <div className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">Items</div>
          </div>
        </div>
      </div>

       {/* Location Preview */}
      <div className="px-4">
        <div className="bg-slate-100 dark:bg-brand-dark border border-slate-200 dark:border-slate-800 rounded-[32px] p-6 flex items-center gap-5 group cursor-pointer hover:bg-brand-slate dark:hover:bg-brand-surface transition-all">
          <div className="w-14 h-14 bg-brand-slate dark:bg-brand-surface rounded-2xl flex items-center justify-center text-primary-blue shadow-sm shrink-0 border border-slate-100 dark:border-slate-700">
            <MapPin className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest leading-none">Shop Location</p>
                <div onClick={() => navigate('/settings')} className="text-[9px] font-bold text-primary-blue uppercase tracking-widest">Edit</div>
             </div>
             <p className="text-sm font-bold text-cream dark:text-cream leading-tight mt-1.5 truncate pr-6">{profile?.address || 'Set shop address'}</p>
          </div>
        </div>
      </div>

      {/* Menu Groups */}
      <div className="px-4 space-y-8">
        {menuGroups.map((group, i) => (
          <div key={i} className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-[0.3em] px-4">{group.title}</h3>
            <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
              {group.items.map((item, j) => (
                <button
                  key={j}
                  onClick={item.onClick || (() => navigate(item.path!))}
                  className={`w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors ${j !== group.items.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">{item.label}</span>
                      {item.sub && <p className="text-[9px] font-black uppercase text-primary-blue tracking-widest mt-0.5">{item.sub}</p>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-teal dark:text-gray-teal" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="px-4 pt-4">
        <button 
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-between p-6 rounded-[32px] border-2 border-red-100 dark:border-red-900/20 bg-red-50/10 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-sm font-black text-red-500 uppercase tracking-widest">Delete Account</span>
              <p className="text-[9px] font-bold text-red-400 dark:text-red-500 uppercase tracking-wider mt-0.5">Permanently close shop</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-red-200 dark:text-red-900/40 group-hover:text-red-500" />
        </button>
      </div>

      <div className="text-center space-y-1">
        <p className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-[0.4em]">MistriGO Merchant v1.5.0</p>
        <p className="text-[9px] font-medium text-gray-teal dark:text-gray-teal opacity-60">Empowering Local Businesses</p>
      </div>
    </div>
  );
};
