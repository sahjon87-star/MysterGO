import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MessageSquare, Search, ArrowLeft, MoreVertical, 
  Phone, Video, Send, Smile, Paperclip, Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const ChatsPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    // This is a simplification. In reality, we'd query chat rooms
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', profile.uid),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to avoid needing custom compound indexes
      data.sort((a: any, b: any) => {
        const timeA = a.lastMessageAt?.seconds || a.lastMessageAt?._seconds || 0;
        const timeB = b.lastMessageAt?.seconds || b.lastMessageAt?._seconds || 0;
        return timeB - timeA; // Descending
      });
      setChats(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [profile?.uid]);

  return (
    <div className="min-h-screen bg-brand-slate dark:bg-slate-950 pb-20">
      {/* Dynamic Header */}
      <div className="bg-brand-dark p-8 pt-12 rounded-b-[48px] shadow-2xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/20 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative z-10 flex items-center justify-between text-cream">
          <div className="space-y-1">
            <h1 className="text-xl font-black uppercase tracking-[0.2em]">Signal Comms</h1>
            <p className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em]">Direct Engagement Lines</p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <MessageSquare size={20} />
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Search Comms */}
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-teal" size={18} />
          <input 
            type="text"
            placeholder="Search active sessions..."
            className="w-full bg-slate-50 dark:bg-brand-dark py-5 pl-16 pr-6 rounded-[32px] outline-none text-xs font-bold text-cream dark:text-cream border border-transparent focus:border-primary-blue transition-all"
          />
        </div>

        {/* Chat List */}
        <div className="space-y-2">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-50 dark:bg-brand-dark rounded-[32px] animate-pulse" />)
          ) : chats.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-20 bg-slate-100/50 dark:bg-brand-dark rounded-[40px] border-2 border-dashed border-slate-200">
              <MessageSquare size={48} className="mb-4" />
              <p className="text-sm font-black uppercase tracking-[0.3em]">No Active Signals</p>
            </div>
          ) : (
            chats.map((chat, idx) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-brand-slate dark:bg-brand-dark p-5 rounded-[40px] border border-slate-100 dark:border-slate-800 flex items-center gap-4 group cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-[24px] bg-slate-100 dark:bg-brand-surface border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {chat.otherUserPhoto ? (
                      <img src={chat.otherUserPhoto} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary-blue font-black text-xl">
                        {chat.otherUserName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  {chat.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-950 shadow-sm" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-cream dark:text-cream uppercase tracking-tight">{chat.otherUserName}</h4>
                    <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest">12:44 Signal</span>
                  </div>
                  <p className="text-xs font-medium text-gray-teal line-clamp-1">
                    {chat.lastMessage || 'Connected to secure node. Waiting for signal initiation...'}
                  </p>
                </div>

                {chat.unreadCount > 0 && (
                  <div className="w-6 h-6 bg-primary-blue text-cream rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg shadow-primary-blue/30">
                    {chat.unreadCount}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
