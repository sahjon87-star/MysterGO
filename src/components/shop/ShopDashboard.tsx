import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'motion/react';
import { ShoppingBag, Package, TrendingUp } from 'lucide-react';

export const ShopDashboard: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight">{profile?.name || 'Shop Portal'}</h2>
        <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
          Store Active
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/40">
          <TrendingUp className="text-emerald-500 mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales (Today)</p>
          <h4 className="text-2xl font-black">৳0</h4>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/40">
          <ShoppingBag className="text-primary-blue mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Orders</p>
          <h4 className="text-2xl font-black">0</h4>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] border border-slate-100 text-center space-y-4">
        <p className="text-slate-400 font-bold uppercase text-xs">Module Restoration in Progress</p>
        <h3 className="text-xl font-bold">Additional Shop sub-modules are being re-initialized.</h3>
      </div>
    </div>
  );
};
