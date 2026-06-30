import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Headphones } from 'lucide-react';

export const SupportFAB = () => {
  const navigate = useNavigate();
  const { user, isCustomer, isProvider, isShopOwner } = useAuth();
  const [hasActiveTicket, setHasActiveTicket] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    
    // Only fetch for customers, providers and shop owners
    if (!isCustomer && !isProvider && !isShopOwner) return;

    const q = query(
      collection(db, 'support_tickets'),
      where('raisedBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const active = snapshot.docs.some(doc => doc.data().status !== 'resolved');
      setHasActiveTicket(active);
    });

    return () => unsubscribe();
  }, [user?.uid, isCustomer, isProvider, isShopOwner]);

  // Don't show for admins or unauthenticated users
  if (!user || (!isCustomer && !isProvider && !isShopOwner)) return null;

  const handleClick = () => {
    if (isCustomer) {
      navigate('/support');
    } else if (isProvider) {
      navigate('/pro/support');
    } else if (isShopOwner) {
      navigate('/merchant/support');
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-28 right-6 z-[9999] w-[60px] h-[60px] bg-brand-amber rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(255,179,0,0.4)] border-2 border-white/20 overflow-hidden"
    >
      {/* We are using the requested image name. If the image is not uploaded to public/ yet, it will fallback or show alt text. */}
      {/* Providing a Lucide icon fallback visually might be tricky with img, so we use an inner container or just the img */}
      <div className="relative flex items-center justify-center w-full h-full">
        {hasActiveTicket && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-brand-amber rounded-full animate-pulse z-10" />
        )}
        <img 
          src="/145-1456105_icons-1-24-7-customer-service-removebg-preview.png" 
          alt="24/7 Support"
          className="w-8 h-8 object-contain drop-shadow-md"
          onError={(e) => {
            // Fallback to lucide icon if image not found
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement?.classList.add('fallback-icon');
          }}
        />
        <style>{`
          .fallback-icon::after {
            content: '';
            display: inline-block;
            width: 24px;
            height: 24px;
            background-color: #1a1a1a;
            mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>') no-repeat center / contain;
            -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>') no-repeat center / contain;
          }
        `}</style>
      </div>
    </motion.button>
  );
};
