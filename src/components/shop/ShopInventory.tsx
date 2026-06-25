import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  ChevronRight, 
  AlertCircle,
  MoreVertical,
  Minus,
  LayoutGrid,
  List,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import toast from 'react-hot-toast';

export const ShopInventory: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'products'),
      where('shopId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = (products || []).filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success('Product deleted');
      } catch (err) {
        toast.error('Delete failed');
      }
    }
  };

  const updateStock = async (id: string, newStock: number) => {
    if (newStock < 0) return;
    try {
      await updateDoc(doc(db, 'products', id), { 
        stock: newStock,
        inStock: newStock > 0
      });
    } catch (err) {
      toast.error('Stock update failed');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Inventory</h2>
           </div>
           <button 
             onClick={() => navigate('/add-product')}
             className="w-12 h-12 bg-primary-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary-blue/20 active:scale-95 transition-all"
           >
              <Plus className="w-6 h-6" />
           </button>
        </div>

        <div className="flex gap-2">
            <div className="relative flex-1 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-blue transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-blue shadow-sm dark:text-white"
              />
            </div>
            <button 
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm"
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar pr-10">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-primary-blue text-white shadow-lg shadow-primary-blue/20' : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square bg-white dark:bg-slate-900 rounded-[32px] animate-pulse h-48" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 space-y-4">
             <div className="text-6xl opacity-10">📦</div>
             <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Inventory is Empty</h3>
             <p className="text-slate-400 dark:text-slate-500 text-xs font-medium max-w-[200px] mx-auto">Start adding products to your shop to see them here.</p>
             <button 
               onClick={() => navigate('/add-product')}
               className="text-primary-blue font-black tracking-widest text-[10px] uppercase pt-4"
             >
               Add first product
             </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-4" : "space-y-4"}>
            {filteredProducts.map((p) => (
              <motion.div 
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex group transition-all hover:border-primary-blue/30 ${viewMode === 'grid' ? 'flex-col' : 'flex-row p-4 gap-4'}`}
              >
                <div className={`${viewMode === 'grid' ? 'aspect-square w-full' : 'w-24 h-24'} bg-slate-50 dark:bg-slate-800 relative overflow-hidden shrink-0`}>
                   <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={p.name} />
                   <div className="absolute top-2 right-2 flex gap-1 transform translate-x-10 group-hover:translate-x-0 transition-transform">
                      <button 
                        onClick={() => handleDelete(p.id!)}
                        className="p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-lg shadow-lg hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                   </div>
                   {p.stock < 5 && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-[8px] font-black text-white uppercase rounded-md shadow-lg">
                        Low Stock
                      </div>
                   )}
                </div>

                <div className={`${viewMode === 'grid' ? 'p-5' : 'flex-1 py-1'} flex flex-col justify-between`}>
                   <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight truncate pr-2">{p.name}</h4>
                        {viewMode === 'grid' && <span className="text-[10px] font-black text-primary-blue leading-none">{formatCurrency(p.price)}</span>}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{p.category}</p>
                      {viewMode === 'list' && (
                        <div className="text-lg font-black text-primary-blue mt-2">{formatCurrency(p.price)}</div>
                      )}
                   </div>

                   <div className={`flex items-center justify-between ${viewMode === 'grid' ? 'mt-6 pt-4 border-t border-slate-50 dark:border-slate-800' : 'mt-2'}`}>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">In Stock</p>
                        <p className={`text-sm font-black ${p.stock < 5 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>{p.stock}</p>
                      </div>
                      <div className="flex items-center gap-1">
                         <button 
                          onClick={() => updateStock(p.id!, p.stock - 1)}
                          className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 active:scale-90 transition-all hover:bg-slate-100"
                        >
                           <Minus className="w-3.5 h-3.5" />
                         </button>
                         <button 
                          onClick={() => updateStock(p.id!, p.stock + 1)}
                          className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 active:scale-90 transition-all hover:bg-slate-100"
                        >
                           <Plus className="w-3.5 h-3.5" />
                         </button>
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
