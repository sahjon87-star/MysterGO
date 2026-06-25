import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, doc, addDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { SupportTicket, SupportMessage } from '../../types';
import toast from 'react-hot-toast';
import { Send, Image as ImageIcon, SendHorizonal, ArrowLeft, HeadphonesIcon, AlertCircle } from 'lucide-react';
import { uploadImage } from '../../services/imgbb';
import { useNavigate } from 'react-router-dom';

export const SupportChat = () => {
  const { user, profile: authProfile, isCustomer, isProvider } = useAuth();
  const profile = authProfile as any;
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // To handle Shop Owner check safely, though it's accessible via AuthContext
  const isShopOwner = !isCustomer && !isProvider;

  useEffect(() => {
    if (!user) return;
    
    // Find active ticket
    const q = query(
      collection(db, 'support_tickets'),
      where('raisedBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ticketId: doc.id, ...doc.data() } as SupportTicket));
      docs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      
      const activeTicket = docs.find(doc => doc.status !== 'resolved');
      if (activeTicket) {
        setTicket(activeTicket);
      } else {
        setTicket(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!ticket) return;
    const q = query(
      collection(db, `support_tickets/${ticket.ticketId}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ messageId: doc.id, ...doc.data() } as SupportMessage)));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [ticket]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !profile) return;
    const msg = newMessage;
    setNewMessage('');

    try {
      let activeTicketId = ticket?.ticketId;
      
      // If no active ticket, create one first
      if (!activeTicketId) {
        const newTicketData = {
          raisedBy: user.uid,
          requesterRole: isShopOwner ? 'shop' : isCustomer ? 'user' : 'worker',
          requesterName: profile.name || 'User',
          requesterPhone: profile.phone || '',
          subject: msg.substring(0, 50) + (msg.length > 50 ? '...' : ''), // Use first message as subject
          status: 'open',
          priority: 'medium',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'support_tickets'), newTicketData);
        activeTicketId = docRef.id;
        // The snapshot listener will pick this up and set it as the active ticket
      }

      await addDoc(collection(db, `support_tickets/${activeTicketId}/messages`), {
        senderId: user.uid,
        senderType: isShopOwner ? 'shop' : isCustomer ? 'user' : 'worker',
        text: msg,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'support_tickets', activeTicketId), {
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      toast.error('Failed to send message');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user || !profile) return;
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      let activeTicketId = ticket?.ticketId;
      
      if (!activeTicketId) {
         const newTicketData = {
          raisedBy: user.uid,
          requesterRole: isShopOwner ? 'shop' : isCustomer ? 'user' : 'worker',
          requesterName: profile.name || 'User',
          requesterPhone: profile.phone || '',
          subject: 'Image Upload',
          status: 'open',
          priority: 'medium',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'support_tickets'), newTicketData);
        activeTicketId = docRef.id;
      }

      const url = await uploadImage(file);
      await addDoc(collection(db, `support_tickets/${activeTicketId}/messages`), {
        senderId: user.uid,
        senderType: isShopOwner ? 'shop' : isCustomer ? 'user' : 'worker',
        text: 'Sent an image',
        attachments: [url],
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'support_tickets', activeTicketId), {
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      toast.error('Image upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-dark p-4 w-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-3 bg-brand-slate rounded-2xl border border-brand-surface text-gray-teal hover:text-cream">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-cream uppercase tracking-tight">Live Support</h1>
          <p className="text-gray-teal text-xs font-bold tracking-widest">24/7 HELPDESK</p>
        </div>
      </div>

      {/* Chat View */}
      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-brand-slate rounded-2xl mb-4 border border-brand-surface">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-brand-surface rounded-full flex items-center justify-center text-brand-amber font-bold">
              {ticket?.assignedTo ? 'A' : '🤖'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-brand-slate rounded-full" />
          </div>
          <div>
            <h3 className="font-bold text-cream text-sm">
              {!ticket ? 'Live Support' : ticket.status === 'open' ? 'Waiting for Agent...' : 'Agent Connected'}
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-gray-teal font-bold">{ticket?.subject || 'Ask us anything'}</p>
          </div>
        </div>
      </div>

      {/* Chat Engine */}
      <div className="flex-1 bg-brand-slate rounded-[32px] overflow-y-auto mb-4 border border-brand-surface p-4 space-y-4 shadow-inner flex flex-col">
        {!ticket ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-brand-amber/10 rounded-full flex items-center justify-center mb-4 border border-brand-amber/20 shadow-inner">
               <HeadphonesIcon className="w-8 h-8 text-brand-amber" />
             </div>
             <p className="text-gray-teal text-sm max-w-[200px]">Send a message to start a live chat with our support team.</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-amber bg-brand-amber/10 px-4 py-1.5 rounded-full border border-brand-amber/20">
                Ticket #{ticket.ticketId.slice(-6).toUpperCase()} Active
              </span>
            </div>
            
            {messages.map((msg) => {
              const isMe = msg.senderType !== 'admin';
              return (
                <div key={msg.messageId} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl ${isMe ? 'bg-brand-amber text-brand-dark rounded-tr-sm shadow-lg shadow-brand-amber/20' : 'bg-brand-surface text-cream rounded-tl-sm border border-brand-surface'}`}>
                    {msg.attachments?.map((url, i) => (
                      <img key={i} src={url} alt="attachment" className="w-full rounded-xl mb-2 object-cover" />
                    ))}
                    <p className="text-sm font-medium">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
          <div className="flex gap-2 items-center bg-brand-slate p-2 rounded-3xl border border-brand-surface shadow-xl">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-3 text-gray-teal hover:text-brand-amber transition-all rounded-full bg-brand-surface hover:bg-brand-dark">
              {isUploading ? <AlertCircle className="w-5 h-5 animate-pulse" /> : <ImageIcon className="w-5 h-5" />}
            </button>
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none text-sm text-cream placeholder-gray-teal focus:ring-0 px-2"
            />
            <button onClick={sendMessage} disabled={!newMessage.trim()} className="p-3.5 bg-brand-amber text-brand-dark rounded-2xl disabled:opacity-50 shadow-lg shadow-brand-amber/20">
              <SendHorizonal className="w-5 h-5" />
            </button>
          </div>
    </div>
  );
};
