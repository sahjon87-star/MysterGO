import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Category } from '../../types';
import { Plus, Trash2, LayoutGrid, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  // New Category Form
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [icon, setIcon] = useState('🛠️');
  const [color, setColor] = useState('bg-slate-100 text-slate-600');

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('name_en'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !nameBn) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name_en: nameEn,
        name_bn: nameBn,
        icon,
        color
      });
      setShowAdd(false);
      setNameEn('');
      setNameBn('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (err) {
      console.error(err);
    }
  };

  const colorOptions = [
    'bg-primary-blue/10 text-primary-blue',
    'bg-action-orange/10 text-action-orange',
    'bg-blue-50 text-blue-600',
    'bg-sky-50 text-sky-600',
    'bg-purple-50 text-purple-600',
    'bg-rose-50 text-rose-600',
    'bg-teal-50 text-teal-600',
    'bg-amber-50 text-amber-600',
  ];

  const handleSeed = async () => {
    const initialCategories = [
      { name_en: 'Raj Mistri', name_bn: 'রাজ মিস্ত্রি', icon: '🧱', color: 'bg-action-orange/10 text-action-orange' },
      { name_en: 'Electrician', name_bn: 'ইলেকট্রিশিয়ান', icon: '⚡', color: 'bg-primary-blue/10 text-primary-blue' },
      { name_en: 'Plumber', name_bn: 'প্লাম্বার', icon: '🔧', color: 'bg-teal-50 text-teal-600' },
      { name_en: 'AC Technician', name_bn: 'এসি টেকনিশিয়ান', icon: '❄️', color: 'bg-sky-50 text-sky-600' },
      { name_en: 'Painter', name_bn: 'পেইন্টার', icon: '🎨', color: 'bg-amber-50 text-amber-600' },
      { name_en: 'Carpenter', name_bn: 'কার্পেন্টার', icon: '🔨', color: 'bg-purple-50 text-purple-600' },
      { name_en: 'Cleaner', name_bn: 'ক্লিনার', icon: '🧹', color: 'bg-teal-50 text-teal-600' },
      { name_en: 'Welder', name_bn: 'ওয়েল্ডার', icon: '🔥', color: 'bg-rose-50 text-rose-600' },
    ];

    try {
      for (const cat of initialCategories) {
        await addDoc(collection(db, 'categories'), cat);
      }
      alert('Categories seeded successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-cream dark:text-cream tracking-tight">Service Categories</h2>
          <p className="text-gray-teal dark:text-gray-teal text-xs font-bold uppercase tracking-widest">Manage platform services</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSeed}
            className="px-4 py-2 bg-primary-blue/10 dark:bg-primary-blue/20 text-primary-blue dark:text-primary-blue rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Seed Initial
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="w-12 h-12 bg-brand-dark dark:bg-primary-blue rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20 dark:shadow-primary-blue/20 active:scale-90 transition-all"
          >
            <Plus className="text-cream w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-20 bg-brand-slate dark:bg-brand-dark rounded-[32px] animate-pulse border border-slate-100 dark:border-slate-800" />)
        ) : categories.length === 0 ? (
          <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] p-16 text-center space-y-4 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="text-5xl opacity-20">📂</div>
            <div className="space-y-1">
              <h4 className="font-black uppercase tracking-tight text-sm text-cream dark:text-cream">No categories found</h4>
              <p className="text-gray-teal dark:text-gray-teal text-[10px] font-medium">Add your first category to get started.</p>
            </div>
          </div>
        ) : (
          categories.map((cat) => (
            <motion.div 
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-slate dark:bg-brand-dark rounded-[32px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${cat.color} dark:bg-opacity-20`}>
                {cat.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-black text-cream dark:text-cream text-sm">{cat.name_en}</h4>
                <p className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest mt-0.5">{cat.name_bn}</p>
              </div>
              <button 
                onClick={() => handleDelete(cat.id)}
                className="p-3 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-slate dark:bg-brand-dark w-full max-w-md rounded-[40px] p-8 space-y-6 border border-slate-100 dark:border-slate-800 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-cream dark:text-cream tracking-tight">Add Category</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 bg-slate-50 dark:bg-brand-surface rounded-xl"><X className="w-5 h-5 text-gray-teal dark:text-gray-teal" /></button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest px-2">Name (English)</label>
                  <input 
                    type="text" 
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-brand-surface border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-primary-blue font-medium text-cream dark:text-cream"
                    placeholder="e.g. Electrician"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest px-2">Name (Bengali)</label>
                  <input 
                    type="text" 
                    required
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-brand-surface border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-primary-blue font-medium text-cream dark:text-cream"
                    placeholder="e.g. ইলেকট্রিশিয়ান"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest px-2">Icon (Emoji)</label>
                    <input 
                      type="text" 
                      required
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-brand-surface border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-primary-blue text-center text-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest px-2">Color Theme</label>
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-brand-surface p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                      {colorOptions.map(c => (
                        <button 
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`w-full aspect-square rounded-lg border-2 transition-all ${c} ${color === c ? 'border-brand-dark dark:border-primary-blue scale-110' : 'border-transparent'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-brand-dark dark:bg-primary-blue text-cream py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-900/20 dark:shadow-primary-blue/20 active:scale-95 transition-all mt-4"
                >
                  Create Category
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
