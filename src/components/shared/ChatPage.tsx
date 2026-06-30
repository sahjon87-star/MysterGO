import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Send, Phone, MessageSquare, Image as ImageIcon, Camera, Loader2, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { uploadImage } from '../../services/imgbb';
import toast from 'react-hot-toast';

export const ChatPage: React.FC = () => {
  const { chatId: otherUserId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otherUserId) return;
    const fetchOtherUser = async () => {
      // Try providers first, then users
      let snap = await getDoc(doc(db, 'providers', otherUserId));
      if (!snap.exists()) {
        snap = await getDoc(doc(db, 'users', otherUserId));
      }
      if (snap.exists()) {
        setOtherUser({ uid: snap.id, ...snap.data() });
      }
      setLoading(false);
    };
    fetchOtherUser();
  }, [otherUserId]);

  useEffect(() => {
    if (!user || !otherUserId) return;

    const chatIds = [user.uid, otherUserId].sort();
    const chatId = chatIds.join('_');

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      // Sort client-side to avoid needing custom compound indexes
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.createdAt?._seconds || Date.now() / 1000;
        const timeB = b.createdAt?.seconds || b.createdAt?._seconds || Date.now() / 1000;
        return timeA - timeB;
      });
      setMessages(data);
      scrollToBottom();
      
      // Mark seen
      snap.docs.forEach(d => {
        if (d.data().senderId !== user.uid && !d.data().seen) {
          updateDoc(doc(db, 'messages', d.id), { seen: true });
        }
      });
    });

    return () => unsubscribe();
  }, [user, otherUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (type: 'text' | 'image' | 'voice' = 'text', content?: string) => {
    if ((type === 'text' && !inputMessage.trim()) || !user || !otherUserId) return;

    setSending(true);
    const chatIds = [user.uid, otherUserId].sort();
    const chatId = chatIds.join('_');

    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: user.uid,
        receiverId: otherUserId,
        type,
        text: type === 'text' ? inputMessage.trim() : null,
        fileUrl: type === 'image' ? content : null,
        createdAt: serverTimestamp(),
        seen: false
      });
      setInputMessage('');
      scrollToBottom();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      await handleSendMessage('image', url);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-screen flex flex-col w-full relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <header className="bg-brand-slate dark:bg-brand-dark border-b border-slate-100 dark:border-slate-800 h-20 flex items-center px-4 gap-4 sticky top-0 z-40 transition-colors">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 dark:hover:bg-brand-surface rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-gray-teal" />
        </button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-primary-blue/10 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden">
              {otherUser?.photoURL ? (
                <img src={otherUser.photoURL} className="w-full h-full object-cover" alt={otherUser.name} referrerPolicy="no-referrer" />
              ) : (
                <span className="text-primary-blue font-bold text-sm tracking-tighter">{getInitials(otherUser?.name || '?')}</span>
              )}
            </div>
            {otherUser?.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary-blue border-4 border-white dark:border-brand-dark rounded-full shadow-sm" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-cream dark:text-cream leading-none">{otherUser?.name}</h2>
            <p className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest mt-1">
              {otherUser?.isOnline ? 'Active Now' : 'Last seen recently'}
            </p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <a href={`tel:${otherUser?.phone}`} className="p-3 bg-slate-50 dark:bg-brand-surface text-slate-600 dark:text-gray-teal rounded-2xl border border-slate-100 dark:border-slate-800 active:scale-90 transition-transform">
            <Phone className="w-5 h-5" />
          </a>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 px-10">
            <div className="w-16 h-16 bg-slate-200 dark:bg-brand-surface rounded-3xl flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-gray-teal" />
            </div>
            <div>
              <p className="font-black text-xs uppercase tracking-widest">Start a Conversation</p>
              <p className="text-[10px] font-medium mt-1">Say hello to {otherUser?.name}! Be polite and professional.</p>
            </div>
          </div>
        ) : (
          messages.map((m, index) => {
            const isMe = m.senderId === user?.uid;
            return (
              <motion.div 
                key={m.id}
                initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[85%] rounded-[24px] p-4 text-sm font-medium shadow-sm relative ${
                  isMe 
                    ? 'bg-primary-blue text-cream rounded-br-none' 
                    : 'bg-brand-slate dark:bg-brand-dark text-slate-700 dark:text-cream rounded-bl-none border border-slate-100 dark:border-slate-800'
                }`}>
                  {m.type === 'image' ? (
                    <img src={m.fileUrl!} className="rounded-xl w-full max-w-[200px]" alt="Sent image" referrerPolicy="no-referrer" />
                  ) : (
                    <p className="leading-relaxed">{m.text}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 px-1">
                  <span className="text-[9px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest">
                    {formatTime(m.createdAt)}
                  </span>
                  {isMe && (
                    m.seen ? <CheckCheck className="w-3 h-3 text-primary-blue" /> : <Check className="w-3 h-3 text-cream dark:text-slate-600" />
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-brand-slate dark:bg-brand-dark border-t border-slate-100 dark:border-slate-800 pb-8 transition-colors">
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-brand-surface p-2 rounded-3xl border border-slate-100 dark:border-slate-700">
          <div className="relative">
            <button className="p-3 text-gray-teal hover:text-primary-blue transition-colors rounded-2xl">
              <ImageIcon className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </div>
          <input 
            type="text" 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-cream dark:text-cream py-3"
            placeholder="Type your message..."
          />
          <button 
            onClick={() => handleSendMessage()}
            disabled={sending || (!inputMessage.trim() && !uploading)}
            className="w-12 h-12 bg-primary-blue hover:bg-primary-blue/90 text-cream rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-primary-blue/20 disabled:opacity-50 disabled:grayscale"
          >
            {sending || uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
