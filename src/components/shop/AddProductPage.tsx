import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, 
  Tag, 
  DollarSign, 
  Database, 
  Upload, 
  ChevronLeft, 
  Loader2, 
  Plus, 
  X, 
  Image as ImageIcon,
  Type,
  Maximize2,
  Trash2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { uploadImage } from '../../services/imgbb';

const CATEGORIES = [
  'Tools',
  'Hardware',
  'Electrical',
  'Plumbing',
  'Paints',
  'Safety Gear',
  'Construction Material',
  'Others'
];

export const AddProductPage: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Tools',
    price: '',
    stock: '',
    description: '',
    image: null as string | null,
    specifications: [] as { key: string; value: string }[]
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadImage(file, `product_${Date.now()}`);
      setFormData(prev => ({ ...prev, image: url }));
      toast.success('Image uploaded to ImgBB successfully!');
    } catch (err: any) {
      console.error('[ProductUpload] Upload failed:', err);
      toast.error(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    if (!formData.name || !formData.price || !formData.stock || !formData.image) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'products'), {
        shopId: profile.uid,
        shopName: profile.shopName || profile.name,
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        inStock: parseInt(formData.stock) > 0,
        description: formData.description,
        image: formData.image, // In real app, this should be a uploaded URL
        specifications: formData.specifications,
        createdAt: serverTimestamp(),
        rating: 0,
        totalSales: 0
      });

      toast.success('Product listed successfully!');
      navigate('/inventory');
    } catch (err) {
      console.error(err);
      toast.error('Failed to list product');
    } finally {
      setLoading(false);
    }
  };

  const addSpec = () => {
    setFormData(prev => ({
      ...prev,
      specifications: [...prev.specifications, { key: '', value: '' }]
    }));
  };

  const removeSpec = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="px-4 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-teal hover:text-slate-600 transition-colors">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h2 className="text-2xl font-black text-cream dark:text-cream uppercase tracking-tight">Add Product</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-10">
        {/* Gallery Upload */}
        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em] px-4">Product Image</h3>
           <div className="relative group">
              {formData.image ? (
                 <div className="aspect-square bg-brand-slate dark:bg-brand-dark rounded-[40px] border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden relative group">
                    <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
                    <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                       <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                        className="bg-red-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all"
                       >
                         <Trash2 className="w-6 h-6" />
                       </button>
                    </div>
                 </div>
              ) : uploadingImage ? (
                 <div className="aspect-square bg-brand-slate dark:bg-brand-dark rounded-[40px] border-4 border-dashed border-primary-blue flex flex-col items-center justify-center gap-6 shadow-sm">
                    <div className="w-20 h-20 bg-primary-blue/10 rounded-[32px] flex items-center justify-center text-primary-blue">
                       <Loader2 className="w-10 h-10 animate-spin" />
                    </div>
                    <div className="text-center space-y-1">
                       <span className="text-[10px] font-black uppercase text-primary-blue tracking-widest block animate-pulse">Uploading to ImgBB...</span>
                       <p className="text-[8px] font-medium text-gray-teal">Processing HQ resolution</p>
                    </div>
                 </div>
              ) : (
                <label className="aspect-square bg-brand-slate dark:bg-brand-dark rounded-[40px] border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-primary-blue hover:bg-primary-blue/5 transition-all shadow-sm">
                   <div className="w-20 h-20 bg-primary-blue/10 rounded-[32px] flex items-center justify-center text-primary-blue">
                      <ImageIcon className="w-10 h-10" />
                   </div>
                   <div className="text-center space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-teal tracking-widest block">Upload HQ Photo</span>
                      <p className="text-[8px] font-medium text-cream">JPG, PNG up to 5MB</p>
                   </div>
                   <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              )}
           </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-6">
           <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em] px-4">Item Identity</h3>
           <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] p-8 border border-slate-50 dark:border-slate-800 shadow-sm space-y-8">
              <div className="space-y-4">
                 <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-teal group-focus-within:text-primary-blue transition-colors">
                       <Type className="w-5 h-5" />
                    </div>
                    <input 
                      required
                      type="text" 
                      placeholder="Product Display Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-brand-surface border-transparent rounded-[24px] pl-16 pr-6 p-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-cream transition-all shadow-inner"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-teal group-focus-within:text-primary-blue transition-colors">
                           <DollarSign className="w-5 h-5" />
                        </div>
                        <input 
                          required
                          type="number" 
                          placeholder="Price"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-brand-surface border-transparent rounded-[24px] pl-16 pr-6 p-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-cream transition-all shadow-inner"
                        />
                    </div>
                    <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-teal group-focus-within:text-primary-blue transition-colors">
                           <Database className="w-5 h-5" />
                        </div>
                        <input 
                          required
                          type="number" 
                          placeholder="Stock"
                          value={formData.stock}
                          onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-brand-surface border-transparent rounded-[24px] pl-16 pr-6 p-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-cream transition-all shadow-inner"
                        />
                    </div>
                 </div>

                 <div className="relative">
                    <div className="absolute left-6 top-6 text-gray-teal">
                       <Maximize2 className="w-5 h-5" />
                    </div>
                    <textarea 
                      placeholder="Product Story & Description..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-brand-surface border-transparent rounded-[32px] pl-16 pr-6 pt-6 p-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-medium dark:text-cream transition-all shadow-inner resize-none"
                    />
                 </div>
              </div>

               <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-2">Category Selection</p>
                  <div className="flex flex-wrap gap-2">
                     {CATEGORIES.map((cat) => (
                       <button
                         key={cat}
                         type="button"
                         onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                         className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${formData.category === cat ? 'bg-primary-blue border-primary-blue text-cream shadow-lg' : 'bg-brand-slate dark:bg-brand-surface border-slate-100 dark:border-slate-700 text-gray-teal'}`}
                       >
                         {cat}
                       </button>
                     ))}
                  </div>
               </div>
           </div>
        </div>

        {/* Specifications */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em]">Specifications</h3>
              <button 
                type="button"
                onClick={addSpec}
                className="text-[10px] font-black text-primary-blue uppercase tracking-widest flex items-center gap-2"
              >
                <Plus className="w-3 h-3" /> Add Detail
              </button>
           </div>
           
           <div className="space-y-3">
              <AnimatePresence>
                {formData.specifications.map((spec, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex gap-3 items-center group"
                  >
                    <input 
                      placeholder="e.g. Color"
                      value={spec.key}
                      onChange={(e) => {
                        const newSpecs = [...formData.specifications];
                        newSpecs[i].key = e.target.value;
                        setFormData(prev => ({ ...prev, specifications: newSpecs }));
                      }}
                      className="flex-1 bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all dark:text-cream"
                    />
                    <input 
                      placeholder="e.g. Red"
                      value={spec.value}
                      onChange={(e) => {
                        const newSpecs = [...formData.specifications];
                        newSpecs[i].value = e.target.value;
                        setFormData(prev => ({ ...prev, specifications: newSpecs }));
                      }}
                      className="flex-1 bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all dark:text-cream"
                    />
                    <button 
                      type="button"
                      onClick={() => removeSpec(i)}
                      className="p-3 text-red-100 group-hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {formData.specifications.length === 0 && (
                <div className="text-center py-12 bg-slate-100/50 dark:bg-brand-dark rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                   <p className="text-[10px] font-bold text-gray-teal uppercase tracking-widest">No detailed specs added yet</p>
                </div>
              )}
           </div>
        </div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-40">
           <button 
             type="submit"
             disabled={loading}
             className="w-full bg-brand-dark dark:bg-primary-blue text-cream py-6 rounded-[28px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
           >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              Publish List Item
           </button>
        </div>
      </form>

      {/* Safety Notice */}
      <div className="px-6 py-4">
         <div className="bg-orange-50/50 dark:bg-orange-500/5 rounded-[28px] p-6 flex gap-4 border border-orange-100 dark:border-orange-500/10">
            <AlertCircle className="w-6 h-6 text-action-orange shrink-0" />
            <p className="text-[10px] font-medium text-gray-teal dark:text-gray-teal leading-relaxed italic">
              "By listing this product, you agree that your inventory information is accurate and will be fulfilled within specified delivery timelines."
            </p>
         </div>
      </div>
    </div>
  );
};
