import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, runTransaction, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { SupportTicket, SupportMessage, AdminProfile, UserProfile, ProviderProfile } from '../../types';
import toast from 'react-hot-toast';
import { Search, Send, Clock, User, Phone, CheckCircle2, AlertCircle, MessageSquare, Image as ImageIcon, SendHorizonal, ArrowLeft, Power } from 'lucide-react';
import { uploadImage } from '../../services/imgbb';

interface CannedResponse {
  id: string;
  shortcut: string;
  text: string;
}

export const AdminSupport = () => {
  const { user, profile } = useAuth();
  const adminProfile = profile as AdminProfile;
  const [activeTab, setActiveTab] = useState<'pool' | 'active' | 'resolved'>('pool');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [requesterInfo, setRequesterInfo] = useState<UserProfile | ProviderProfile | null>(null);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCannedMenu, setShowCannedMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Toggle Online Status
  const toggleOnlineStatus = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'admins', user.uid), {
        isOnline: !adminProfile?.isOnline
      });
      toast.success(adminProfile?.isOnline ? 'You are now offline' : 'You are now online');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Fetch Canned Responses
  useEffect(() => {
    const fetchCanned = async () => {
      try {
        const snap = await getDocs(collection(db, 'canned_responses'));
        if (snap.empty) {
          // Seed some default ones
          const defaults = [
            { shortcut: '/hello', text: 'Hello, how can I help you today?' },
            { shortcut: '/delay', text: 'हम आपकी समस्या की जांच कर रहे हैं, कृपया 2 मिनट प्रतीक्षा करें।' },
            { shortcut: '/screenshot', text: 'Could you please provide a screenshot of the issue?' },
            { shortcut: '/resolved', text: 'I am marking this ticket as resolved. Let us know if you need more help.' }
          ];
          for (const d of defaults) {
            await addDoc(collection(db, 'canned_responses'), d);
          }
          setCannedResponses(defaults.map((d, i) => ({ id: `default_${i}`, ...d })));
        } else {
          setCannedResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as CannedResponse)));
        }
      } catch (e) {
        console.error("Failed to load canned responses", e);
      }
    };
    fetchCanned();
  }, []);

  // Fetch Tickets
  useEffect(() => {
    if (!user) return;
    
    // Fallback: without orderBy so we don't run into index errors immediately if index is missing.
    // The sorting can be done client-side if needed for small volumes.
    const q = query(collection(db, 'support_tickets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ ticketId: doc.id, ...doc.data() } as SupportTicket));
      fetched.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTickets(fetched);
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-Timeout Logic (Frontend simulation of Cloud Function)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      tickets.forEach(async (ticket) => {
        // If ticket is in-progress by ME, and hasn't been updated in 5 minutes
        if (ticket.status === 'in-progress' && ticket.assignedTo === user.uid) {
          const lastUpdated = ticket.updatedAt?.toMillis() || 0;
          const fiveMins = 5 * 60 * 1000;
          if (Date.now() - lastUpdated > fiveMins) {
            try {
              await updateDoc(doc(db, 'support_tickets', ticket.ticketId), {
                status: 'open',
                assignedTo: null,
                updatedAt: serverTimestamp()
              });
              toast.error(`Ticket #${ticket.ticketId.slice(-6)} timed out and returned to pool.`);
              if (selectedTicket?.ticketId === ticket.ticketId) {
                setSelectedTicket(null);
                setActiveTab('pool');
              }
            } catch (e) {
              console.error("Failed to timeout ticket");
            }
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [tickets, user, selectedTicket]);

  // Fetch Messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) return;
    const q = query(
      collection(db, `support_tickets/${selectedTicket.ticketId}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ messageId: doc.id, ...doc.data() } as SupportMessage)));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [selectedTicket]);

  // Fetch Requester Info
  useEffect(() => {
    if (!selectedTicket) return;
    const coll = selectedTicket.requesterRole === 'worker' ? 'providers' : 'users';
    const unsub = onSnapshot(doc(db, coll, selectedTicket.raisedBy), (docSnap) => {
      if (docSnap.exists()) {
        setRequesterInfo(docSnap.data() as any);
      }
    });
    return () => unsub();
  }, [selectedTicket]);

  const poolTickets = tickets.filter(t => t.status === 'open');
  const activeTickets = tickets.filter(t => t.status === 'in-progress' && t.assignedTo === user?.uid);
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' && t.assignedTo === user?.uid);

  const displayTickets = activeTab === 'pool' ? poolTickets : activeTab === 'active' ? activeTickets : resolvedTickets;

  const handleClaimTicket = async (ticket: SupportTicket) => {
    if (!user) return;
    try {
      const ticketRef = doc(db, 'support_tickets', ticket.ticketId);
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(ticketRef);
        if (!sfDoc.exists() || sfDoc.data().status !== 'open') {
          throw new Error("Ticket already claimed or unavailable.");
        }
        transaction.update(ticketRef, { 
          status: 'in-progress', 
          assignedTo: user.uid,
          updatedAt: serverTimestamp()
        });
      });
      toast.success("Ticket claimed successfully");
      setSelectedTicket({...ticket, status: 'in-progress', assignedTo: user.uid});
      setActiveTab('active');
    } catch (e: any) {
      toast.error(e.message || "Failed to claim ticket");
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateDoc(doc(db, 'support_tickets', selectedTicket.ticketId), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Ticket resolved");
      setSelectedTicket(null);
    } catch (e) {
      toast.error("Failed to resolve ticket");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return;
    const msg = newMessage;
    setNewMessage('');
    setShowCannedMenu(false);
    try {
      await addDoc(collection(db, `support_tickets/${selectedTicket.ticketId}/messages`), {
        senderId: user.uid,
        senderType: 'admin',
        text: msg,
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'support_tickets', selectedTicket.ticketId), {
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      toast.error('Failed to send message');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedTicket || !user) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      await addDoc(collection(db, `support_tickets/${selectedTicket.ticketId}/messages`), {
        senderId: user.uid,
        senderType: 'admin',
        text: 'Sent an image',
        attachments: [url],
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'support_tickets', selectedTicket.ticketId), {
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      toast.error('Image upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    if (val === '/') {
      setShowCannedMenu(true);
    } else if (!val.startsWith('/')) {
      setShowCannedMenu(false);
    }
  };

  const applyCannedResponse = (text: string) => {
    setNewMessage(text);
    setShowCannedMenu(false);
  };

  if (selectedTicket) {
    return (
      <div className="flex flex-col h-full bg-brand-dark p-4 relative">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 bg-brand-slate rounded-2xl mb-4 border border-brand-surface">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedTicket(null)} className="p-2 bg-brand-surface rounded-xl text-gray-teal hover:text-cream transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-bold text-cream">Ticket #{selectedTicket.ticketId.slice(-6).toUpperCase()}</h2>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-teal">
                <span className={`px-2 py-0.5 rounded-md ${selectedTicket.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-brand-surface'}`}>
                  {selectedTicket.priority} Priority
                </span>
                <span>• {selectedTicket.requesterName}</span>
              </div>
            </div>
          </div>
          {selectedTicket.status !== 'resolved' && (
            <button onClick={handleResolveTicket} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
              Resolve
            </button>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-brand-dark rounded-2xl overflow-y-auto mb-4 border border-brand-surface p-4 space-y-4">
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-teal bg-brand-surface px-3 py-1 rounded-full">
              Subject: {selectedTicket.subject}
            </span>
          </div>
          {messages.map((msg) => {
            const isAdmin = msg.senderType === 'admin';
            const isBot = msg.senderType === 'chatbot';
            return (
              <div key={msg.messageId} className={`flex ${isBot ? 'justify-center' : isAdmin ? 'justify-end' : 'justify-start'}`}>
                {isBot ? (
                  <div className="bg-brand-surface/60 border border-slate-700/50 rounded-2xl p-4 text-center max-w-[85%] space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-gray-teal font-bold text-xs uppercase tracking-wider">
                      <span>🤖</span>
                      <span>MistriGO Bot Reply</span>
                    </div>
                    <p className="text-xs text-cream font-medium whitespace-pre-line text-left leading-relaxed">{msg.text}</p>
                  </div>
                ) : (
                  <div className={`max-w-[80%] p-3 rounded-2xl ${isAdmin ? 'bg-brand-amber text-brand-dark rounded-tr-sm' : 'bg-brand-surface text-cream rounded-tl-sm'}`}>
                    {msg.attachments?.map((url, i) => (
                      <img key={i} src={url} alt="attachment" className="w-full rounded-xl mb-2" />
                    ))}
                    <p className="text-sm font-medium whitespace-pre-line">{msg.text}</p>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {selectedTicket.status !== 'resolved' ? (
          <div className="relative">
            {/* Canned Responses Dropdown */}
            <AnimatePresence>
              {showCannedMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-brand-slate border border-brand-surface rounded-2xl p-2 shadow-2xl max-h-48 overflow-y-auto z-10"
                >
                  <p className="text-[10px] font-bold text-gray-teal uppercase tracking-widest px-2 mb-2">Quick Replies</p>
                  {cannedResponses.filter(cr => cr.shortcut.startsWith(newMessage)).map(cr => (
                    <button 
                      key={cr.id}
                      onClick={() => applyCannedResponse(cr.text)}
                      className="w-full text-left p-2 hover:bg-brand-surface rounded-xl flex items-center justify-between group"
                    >
                      <span className="text-sm text-cream truncate pr-4">{cr.text}</span>
                      <span className="text-[10px] text-gray-teal font-mono bg-brand-dark px-2 py-1 rounded-md">{cr.shortcut}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 items-center bg-brand-slate p-2 rounded-2xl border border-brand-surface">
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-3 text-gray-teal hover:text-brand-amber transition-all">
                {isUploading ? <AlertCircle className="w-5 h-5 animate-pulse" /> : <ImageIcon className="w-5 h-5" />}
              </button>
              <input 
                type="text" 
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message or '/' for quick replies..."
                className="flex-1 bg-transparent border-none text-sm text-cream placeholder-gray-teal focus:ring-0"
              />
              <button onClick={sendMessage} disabled={!newMessage.trim()} className="p-3 bg-brand-amber text-brand-dark rounded-xl disabled:opacity-50">
                <SendHorizonal className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 bg-brand-surface rounded-2xl text-gray-teal text-sm font-bold">
            This ticket has been resolved.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header & Status Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-cream uppercase tracking-tight">Support Desk</h1>
          <p className="text-gray-teal text-sm">24/7 Command Center</p>
        </div>
        <button 
          onClick={toggleOnlineStatus}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${adminProfile?.isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-brand-surface text-gray-teal'}`}
        >
          <Power className="w-4 h-4" />
          {adminProfile?.isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-brand-slate p-1 rounded-2xl border border-brand-surface">
        <button onClick={() => setActiveTab('pool')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pool' ? 'bg-brand-surface text-brand-amber shadow-sm' : 'text-gray-teal hover:text-cream'}`}>
          Pool ({poolTickets.length})
        </button>
        <button onClick={() => setActiveTab('active')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-brand-surface text-brand-amber shadow-sm' : 'text-gray-teal hover:text-cream'}`}>
          Active ({activeTickets.length})
        </button>
        <button onClick={() => setActiveTab('resolved')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'resolved' ? 'bg-brand-surface text-brand-amber shadow-sm' : 'text-gray-teal hover:text-cream'}`}>
          Resolved ({resolvedTickets.length})
        </button>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        <AnimatePresence>
          {displayTickets.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-brand-surface mx-auto mb-4" />
              <p className="text-gray-teal font-medium">No tickets in this queue.</p>
            </motion.div>
          ) : (
            displayTickets.map((ticket) => (
              <motion.div
                key={ticket.ticketId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-slate border border-brand-surface p-4 rounded-2xl"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-cream text-sm mb-1">{ticket.subject}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-teal flex-wrap">
                      <span>{ticket.requesterName}</span>
                      <span>•</span>
                      <span className={ticket.priority === 'high' ? 'text-red-400' : ''}>{ticket.priority} Priority</span>
                      {ticket.chatbotEscalated && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black uppercase tracking-widest rounded">🤖 Bot Escalated</span>
                        </>
                      )}
                    </div>
                  </div>
                  {activeTab === 'pool' && (
                    <button 
                      onClick={() => handleClaimTicket(ticket)}
                      className="px-3 py-1.5 bg-brand-amber text-brand-dark rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-amber/20"
                    >
                      Claim
                    </button>
                  )}
                  {activeTab !== 'pool' && (
                    <button 
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-3 py-1.5 bg-brand-surface text-cream rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Open
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

