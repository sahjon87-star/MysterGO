import { doc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const seedDatabase = async () => {
  const batch = writeBatch(db);

  // 1. Initial Settings
  const settingsRef = doc(db, 'settings', 'system_config');
  batch.set(settingsRef, {
    applicationFeeRate: 5,
    paymentChargeRate: 2,
    referralAmount: 50,
    firstBookingDiscount: 100,
    bkashNumber: '01712345678',
    nagadNumber: '01812345678',
    supportPhone: '+8801712345678',
    whatsappNumber: '8801712345678',
    announcements: [
      {
        id: 'welcome_notif',
        title: 'Welcome to MistriGO!',
        body: 'Find the best workers and shops near you in Dhaka. Book now for high-quality service!',
        type: 'info',
        createdAt: new Date().toISOString()
      },
      {
        id: 'promo_notif',
        title: 'Ramadan Special Offer!',
        body: 'Get ৳100 discount on your first booking using code WELCOME100',
        type: 'promotion',
        createdAt: new Date().toISOString()
      }
    ],
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 2. Promotions
  const promoRef = doc(db, 'settings', 'promotions');
  batch.set(promoRef, {
    text: "৳100 OFF your first booking! Special offer for new users.",
    isActive: true,
    backgroundColor: '#1A438D',
    textColor: '#ffffff'
  }, { merge: true });

  // 3. Categories
  const categories = [
    { id: 'electrician', name_en: 'Electrician', name_bn: 'ইলেক্ট্রিশিয়ান', icon: '⚡', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    { id: 'plumber', name_en: 'Plumber', name_bn: 'প্লাম্বার', icon: '🔧', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { id: 'ac_service', name_en: 'AC Service', name_bn: 'এসি সার্ভিস', icon: '❄️', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
    { id: 'painter', name_en: 'Painter', name_bn: 'পেইন্টার', icon: '🎨', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
    { id: 'carpenter', name_en: 'Carpenter', name_bn: 'কার্পেন্টার', icon: '🪚', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    { id: 'cleaner', name_en: 'Cleaner', name_bn: 'ক্লিনার', icon: '🧹', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { id: 'gas_stove', name_en: 'Gas Stove', name_bn: 'গ্যাস স্টোভ', icon: '🔥', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  ];

  categories.forEach(cat => {
    const catRef = doc(db, 'categories', cat.id);
    batch.set(catRef, { ...cat, updatedAt: serverTimestamp() }, { merge: true });
  });

  await batch.commit();
  console.log('✅ Database seeded successfully!');
};
