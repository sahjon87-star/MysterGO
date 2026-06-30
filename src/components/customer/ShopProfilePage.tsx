import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ArrowLeft, Star, MapPin, Package, Phone, CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ShopProfile, Product } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import toast from 'react-hot-toast';

export const ShopProfilePage: React.FC = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchShop = async () => {
      if (!shopId) return;
      try {
        const snap = await getDoc(doc(db, 'shops', shopId));
        if (snap.exists()) {
          setShop({ uid: snap.id, ...snap.data() } as ShopProfile);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();

    const q = query(collection(db, 'products'), where('shopId', '==', shopId));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    return () => unsub();
  }, [shopId]);

  const handleOrder = async (product: Product) => {
    if (!profile || !shop) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'orders'), {
        customerId: profile.uid,
        customerName: profile.name,
        customerPhone: profile.phone,
        customerAddress: profile.address || 'Dhaka, Bangladesh',
        shopId: shop.uid,
        shopName: shop.shopName,
        productId: product.id,
        productName: product.name,
        price: product.price,
        totalAmount: product.price + 50, // Product price + standard ৳50 delivery fee expected by OrderDetailsPage
        totalItems: 1,
        items: [
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image || product.imageUrl || '',
          }
        ],
        status: 'pending',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Order placed successfully!');
      setSelectedProduct(null);
      navigate('/bookings');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!shop) return <div className="min-h-screen flex items-center justify-center">Shop not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      {/* Hero */}
      <div className="bg-brand-dark px-4 pt-6 pb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <button onClick={() => navigate(-1)} className="relative z-10 p-2 bg-white/10 hover:bg-white/20 text-cream rounded-full transition-all mb-6">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative z-10 flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center shadow-2xl">
            <ShoppingBag className="w-10 h-10 text-primary-blue" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-cream">{shop.shopName || 'Unnamed Shop'}</h2>
            <p className="text-gray-teal text-sm font-bold uppercase tracking-wider">{shop.shopCategory?.replace('_', ' ') || 'Shop'}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-primary-blue/20 px-2 py-0.5 rounded-lg border border-primary-blue/30">
                <Star className="w-3 h-3 fill-primary-blue text-primary-blue" />
                <span className="text-[10px] font-black text-primary-blue">{(shop.rating || 0).toFixed(1)}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-teal uppercase tracking-widest">{shop.totalSales || 0} Orders</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-20">
        <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] shadow-xl p-6 border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-teal shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 dark:text-gray-teal font-medium">{shop.shopAddress || 'No address provided'}</p>
          </div>
          <a href={`tel:${shop.uid}`} className="flex items-center gap-3 text-primary-blue text-sm font-bold">
            <Phone className="w-4 h-4" />
            Contact Shop
          </a>
        </div>
      </div>

      <div className="p-4 space-y-6 mt-4">
        <h3 className="font-black text-cream dark:text-cream uppercase tracking-tight text-sm px-2">Products</h3>
        
        {products.length === 0 ? (
          <div className="text-center py-20 space-y-3 bg-brand-slate dark:bg-brand-dark rounded-[32px] border border-slate-100 dark:border-slate-800">
            <Package className="w-12 h-12 text-cream dark:text-slate-700 mx-auto" />
            <p className="text-gray-teal dark:text-gray-teal font-bold text-sm uppercase tracking-widest">No products listed</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {products.map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedProduct(product)}
                className="bg-brand-slate dark:bg-brand-dark rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="w-16 h-16 bg-slate-50 dark:bg-brand-surface rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                  {product.image ? (
                    <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                  ) : (
                    <Package className="w-6 h-6 text-cream" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-cream dark:text-cream text-sm">{product.name}</h4>
                  <p className="text-[10px] text-gray-teal dark:text-gray-teal font-medium line-clamp-1">{product.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-primary-blue font-black text-lg">{formatCurrency(product.price)}</div>
                  {(product.stock !== undefined ? product.stock > 0 : product.inStock) ? (
                    <span className="text-[8px] font-black text-primary-blue uppercase tracking-widest">In Stock</span>
                  ) : (
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Out of Stock</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-brand-slate dark:bg-brand-dark w-full max-w-md rounded-t-[40px] p-8 space-y-6 border-t border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight text-cream dark:text-cream uppercase">{selectedProduct.name}</h3>
                  <p className="text-xs font-bold text-primary-blue uppercase tracking-[0.2em]">{shop.shopName || 'Shop'}</p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-2 bg-slate-100 dark:bg-brand-surface rounded-xl">
                  <X className="w-5 h-5 text-gray-teal" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="w-full h-48 bg-slate-50 dark:bg-brand-surface rounded-[32px] overflow-hidden border border-slate-100 dark:border-slate-700">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-cream" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-2">Description</label>
                  <p className="text-xs text-slate-600 dark:text-gray-teal leading-relaxed bg-slate-50 dark:bg-brand-surface/50 p-4 rounded-2xl">{selectedProduct.description}</p>
                </div>
                <div className="flex items-center justify-between bg-brand-dark dark:bg-primary-blue rounded-2xl p-5 text-cream">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-70">Total Amount</span>
                  <span className="text-2xl font-black tracking-tight">{formatCurrency(selectedProduct.price)}</span>
                </div>
                <button 
                  onClick={() => handleOrder(selectedProduct)}
                  disabled={submitting || !(selectedProduct.stock !== undefined ? selectedProduct.stock > 0 : selectedProduct.inStock)}
                  className="w-full bg-primary-blue hover:bg-primary-blue/90 text-cream py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-blue/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'PROCESSING...' : 'PLACE ORDER NOW'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
