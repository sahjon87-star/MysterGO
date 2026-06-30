import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SupportTicket, SupportMessage } from '../../types';
import toast from 'react-hot-toast';
import { 
  Send, 
  Image as ImageIcon, 
  SendHorizonal, 
  ArrowLeft, 
  HeadphonesIcon, 
  AlertCircle,
  Calculator,
  User as UserIcon,
  Trash2,
  Wallet,
  MessageSquare,
  Bot
} from 'lucide-react';
import { uploadImage } from '../../services/imgbb';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

// 24/7 Chatbot pre-defined knowledge database
const CHATBOT_KNOWLEDGE: Record<string, Record<string, string>> = {
  en: {
    greeting: "Hello, Welcome to MistriGO! Please let us know your problem. I am your 24/7 automated assistant.",
    calculator: `🧮 **Material Calculator Navigation**:\n\nTo navigate to and use the Material Calculator:\n1. Open your Customer dashboard.\n2. Locate the **Calculator** icon/card on the top banner or home screen.\n3. Input your construction measurements (Length, Width, Height) to estimate cement bags, bricks, sand CFT, and paint liters instantly using regional market standard formulas.\n\nType **menu** to view options or click a button below.`,
    profile: `👤 **Profile & Settings Updates**:\n\nTo update your profile information:\n• **Customers**: Go to **Profile** page (bottom navigation) -> click the **Edit icon** (pencil) next to your name. Update your Name or Phone, then click the checkmark to save.\n• **Providers/Merchants**: Navigate to the **Settings** section to modify your display brand name, Category, or Physical Address.\n\nType **menu** to view options or click a button below.`,
    delete: `⚠️ **Account Deletion Sequence**:\n\nTo permanently delete your account:\n• **Customers**: Navigate to Settings -> Scroll down to the **Danger Zone** -> Click **Delete Account** -> Accept the 3 declaration checks -> Click **Permanently Delete Account**.\n• **Providers (Workers)**: Navigate to Profile -> Tap 'Delete Account' at the bottom -> Confirm declarations to trigger permanent deletion.\n• **Merchants (Shops)**: Go to Profile -> Scroll down to **Danger Zone** -> Click **Delete Account** -> Accept the terms -> click **Permanently Delete Account**.\n\nType **menu** to view options or click a button below.`,
    wallet: `💳 **Wallet & Balance Issues**:\n\nFor financial and wallet issues:\n• Open your **Wallet** tab to review cash-in history, recent balance adjustments, and settled deposits.\n• Balance updates generally reflect within 1-2 minutes. If a bKash or Nagad cash-in fails or shows pending, please click 'Speak to a Live Admin' below and attach a receipt/screenshot.\n\nType **menu** to view options or click a button below.`,
    escalate: `📞 **Live Support Escalation**:\n\nI am now transferring your conversation to our Live Support Team. Your ticket has been marked as **Active/Unresolved** and pushed to the Admin Support Desk Pool. A human administrator will join and respond shortly! Thank you for your patience.`,
    fallback: `🤖 I'm a rule-based helper and couldn't find a direct solution to your query. Let me escalate this to our Live Admin Desk for human assistance.`
  },
  bn: {
    greeting: "হ্যালো, MistriGO-তে আপনাকে স্বাগতম! অনুগ্রহ করে আপনার সমস্যাটি আমাদের জানান। আমি আপনার ২৪/৭ অটোমেটেড অ্যাসিস্ট্যান্ট।",
    calculator: `🧮 **ম্যাটেরিয়াল ক্যালকুলেটর গাইড**:\n\nক্যালকুলেটর ব্যবহার করতে:\n১. আপনার কাস্টমার ড্যাশবোর্ডটি ওপেন করুন।\n২. হোম স্ক্রিনের উপরে অবস্থিত **ক্যালকুলেটর** আইকনটিতে ক্লিক করুন।\n৩. আপনার পরিমাপ (দৈর্ঘ্য, প্রস্থ, উচ্চতা) ইনপুট দিয়ে সিমেন্ট, ইট, বালু এবং পেইন্টের পরিমাণ মুহূর্তেই হিসাব করে নিন।\n\nমেনুতে ফিরতে **menu** লিখুন অথবা নিচের যেকোনো বাটনে ক্লিক করুন।`,
    profile: `👤 **প্রোফাইল আপডেট করার নিয়ম**:\n\nপ্রোফাইল পরিবর্তন করতে:\n• **কাস্টমার**: নিচে ডানদিকের **প্রোফাইল** ট্যাবে যান -> আপনার নামের পাশের **এডিট আইকন** (পেন্সিল) এ ক্লিক করুন। নাম বা ফোন নম্বর পরিবর্তন করে টিক চিহ্নে ক্লিক করুন।\n• **প্রোভাইডার/মার্চেন্ট**: প্রোফাইল বা সেটিংস পেজে গিয়ে আপনার ব্র্যান্ড নাম, ক্যাটাগরি, অথবা ঠিকানা সহজে আপডেট করতে পারেন।\n\nমেনুতে ফিরতে **menu** লিখুন অথবা নিচের যেকোনো বাটনে ক্লিক করুন।`,
    delete: `⚠️ **অ্যাকাউন্ট ডিলিট করার নিয়ম**:\n\nস্থায়ীভাবে অ্যাকাউন্ট মুছে ফেলতে:\n• **কাস্টমার**: সেটিংসে যান -> স্ক্রল করে নিচে **Danger Zone**-এ যান -> **Delete Account**-এ ক্লিক করুন -> ৩টি সম্মতি ঘরে টিক দিন -> নিশ্চিত করুন।\n• **প্রোভাইডার**: প্রোফাইল থেকে নিচে 'Delete Account' এ ট্যাপ করুন এবং শর্তাবলি মেনে কনফার্ম করুন।\n• **মার্চেন্ট**: প্রোফাইলের নিচে **Danger Zone** থেকে **Delete Account** ক্লিক করে সব শর্তাবলি টিক দিয়ে কনফার্ম করুন।\n\nমেনুতে ফিরতে **menu** লিখুন অথবা নিচের যেকোনো বাটনে ক্লিক করুন।`,
    wallet: `💳 **ওয়ালেট এবং ব্যালেন্স সংক্রান্ত**:\n\nওয়ালেট ব্যালেন্সের জন্য:\n• আপনার **Wallet** ট্যাবে গিয়ে ব্যালেন্স অ্যাড, ক্যাশ-ইন এবং ট্রানজেকশন হিস্ট্রি দেখতে পারেন।\n• সাধারণত ১-২ মিনিটের মধ্যে ওয়ালেট ব্যালেন্স আপডেট হয়। বিকাশ/নগদ সংক্রান্ত যেকোনো সমস্যায় ট্রানজেকশন স্ক্রিনশট পাঠিয়ে নিচের 'সরাসরি কথা বলুন' বাটনে ক্লিক করুন।\n\nমেনুতে ফিরতে **menu** লিখুন অথবা নিচের যেকোনো বাটনে ক্লিক করুন।`,
    escalate: `📞 **সরাসরি এডমিন সাপোর্ট**:\n\nআমি আপনার এই চ্যাটটি আমাদের লাইভ এডমিন টিমের কাছে ট্রান্সফার করছি। আপনার টিকিটটি **সরাসরি এডমিন চ্যাটে** পাঠানো হয়েছে এবং একজন এডমিন খুব শীঘ্রই আপনার সাথে যুক্তবেন। ধন্যবাদ!`,
    fallback: `🤖 আমি একটি স্বয়ংক্রিয় বট এবং আপনার প্রশ্নটি সরাসরি মেলাতে পারিনি। আমি চ্যাটটি লাইভ এডমিন সাপোর্টের কাছে হস্তান্তর করছি।`
  }
};

// Clean rendering of bold markers and line breaks for chatbot markdown response
const renderMessageText = (text: string) => {
  return text.split('\n').map((line, index) => {
    const parts = line.split('**');
    return (
      <p key={index} className="text-sm font-medium leading-relaxed min-h-[0.5rem]">
        {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-extrabold text-brand-amber">{part}</strong> : part)}
      </p>
    );
  });
};

export const SupportChat = () => {
  const { user, profile: authProfile, isCustomer, isProvider } = useAuth();
  const { lang } = useLanguage();
  const profile = authProfile as any;
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // To handle Shop Owner check safely
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_tickets');
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `support_tickets/${ticket.ticketId}/messages`);
    });
    return () => unsubscribe();
  }, [ticket]);

  // Handle chatbot automated answer rule engine
  const handleBotResponse = async (activeTicketId: string, userText: string, isFirstMsg: boolean = false) => {
    const cleanText = userText.trim().toLowerCase();
    const l = lang === 'bn' ? 'bn' : 'en';
    const dbData = CHATBOT_KNOWLEDGE[l];

    let botReplyText: string;
    let shouldEscalate = false;

    // Matches
    const isCal = cleanText.includes('1') || cleanText.includes('calc') || cleanText.includes('cement') || cleanText.includes('brick') || cleanText.includes('sand') || cleanText.includes('paint') || cleanText.includes('ক্যালকুলেটর') || cleanText.includes('হিসাব');
    const isProf = cleanText.includes('2') || cleanText.includes('profile') || cleanText.includes('update') || cleanText.includes('name') || cleanText.includes('phone') || cleanText.includes('প্রোফাইল') || cleanText.includes('নাম') || cleanText.includes('ফোন');
    const isDel = cleanText.includes('3') || cleanText.includes('delete') || cleanText.includes('purge') || cleanText.includes('remove') || cleanText.includes('ডিলিট') || cleanText.includes('অ্যাকাউন্ট');
    const isWal = cleanText.includes('4') || cleanText.includes('wallet') || cleanText.includes('balance') || cleanText.includes('bkash') || cleanText.includes('nagad') || cleanText.includes('money') || cleanText.includes('টাকা') || cleanText.includes('ব্যালেন্স');
    const isEsc = cleanText.includes('5') || cleanText.includes('admin') || cleanText.includes('escalate') || cleanText.includes('human') || cleanText.includes('agent') || cleanText.includes('talk') || cleanText.includes('সরাসরি') || cleanText.includes('এডমিন');

    if (cleanText === 'menu' || cleanText === 'hi' || cleanText === 'hello' || cleanText === 'hey' || cleanText === 'শুরু' || cleanText === 'start') {
      botReplyText = `${dbData.greeting}\n\n1. 🧮 Material Calculator Guide\n2. 👤 Profile & Settings Updates\n3. ⚠️ Account Deletion Sequence\n4. 💳 Wallet & Balance Issues\n5. 📞 Speak to a Live Agent\n\n*Type the option number, keyword, or select a button below.*`;
    } else if (isCal) {
      botReplyText = dbData.calculator;
    } else if (isProf) {
      botReplyText = dbData.profile;
    } else if (isDel) {
      botReplyText = dbData.delete;
    } else if (isWal) {
      botReplyText = dbData.wallet;
    } else if (isEsc) {
      botReplyText = dbData.escalate;
      shouldEscalate = true;
    } else {
      if (isFirstMsg) {
        // Welcoming response sequence for first messages that are greetings or general
        botReplyText = `*Welcome!* 🤖\n\n${dbData.greeting}\n\n1. 🧮 Material Calculator Guide\n2. 👤 Profile & Settings Updates\n3. ⚠️ Account Deletion Sequence\n4. 💳 Wallet & Balance Issues\n5. 📞 Speak to a Live Agent\n\n*Type the option number, keyword, or select a button below.*`;
      } else {
        // Subsequent message with unmapped keywords - triggers the graceful live admin escalation!
        botReplyText = `${dbData.fallback}\n\n${dbData.escalate}`;
        shouldEscalate = true;
      }
    }

    // Add chatbot response message to Firestore
    await addDoc(collection(db, `support_tickets/${activeTicketId}/messages`), {
      senderId: 'chatbot',
      senderType: 'chatbot',
      text: botReplyText,
      timestamp: serverTimestamp()
    });

    if (shouldEscalate) {
      await updateDoc(doc(db, 'support_tickets', activeTicketId), {
        chatbotEscalated: true,
        status: 'open', // Open status routes it straight to Pool for human claims
        priority: 'high', // Elevate to High Priority for direct support visibility
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'support_tickets', activeTicketId), {
        updatedAt: serverTimestamp()
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !profile) return;
    const msg = newMessage;
    setNewMessage('');

    try {
      let activeTicketId = ticket?.ticketId;
      const isFirst = !activeTicketId;
      
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

      // Handle chatbot reply if the ticket is not escalated or claimed yet
      const currentTicket = ticket || { assignedTo: null, chatbotEscalated: false };
      if (!currentTicket.assignedTo && !currentTicket.chatbotEscalated) {
        await handleBotResponse(activeTicketId, msg, isFirst);
      }
    } catch (e) {
      toast.error('Failed to send message');
    }
  };

  const sendQuickReply = async (value: string, label: string) => {
    if (!user || !profile) return;
    
    try {
      let activeTicketId = ticket?.ticketId;
      const isFirst = !activeTicketId;
      
      if (!activeTicketId) {
        const newTicketData = {
          raisedBy: user.uid,
          requesterRole: isShopOwner ? 'shop' : isCustomer ? 'user' : 'worker',
          requesterName: profile.name || 'User',
          requesterPhone: profile.phone || '',
          subject: label,
          status: 'open',
          priority: 'medium',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'support_tickets'), newTicketData);
        activeTicketId = docRef.id;
      }

      // Add user selection message to Firestore
      await addDoc(collection(db, `support_tickets/${activeTicketId}/messages`), {
        senderId: user.uid,
        senderType: isShopOwner ? 'shop' : isCustomer ? 'user' : 'worker',
        text: label,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'support_tickets', activeTicketId), {
        updatedAt: serverTimestamp()
      });

      // Trigger chatbot reply corresponding to selected option
      await handleBotResponse(activeTicketId, value, isFirst);
    } catch (e) {
      toast.error('Failed to send request');
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

  const quickReplies = [
    { label: lang === 'bn' ? '🧮 ক্যালকুলেটর গাইড' : '🧮 Material Calculator', value: '1', icon: <Calculator className="w-3.5 h-3.5 text-brand-amber" /> },
    { label: lang === 'bn' ? '👤 প্রোফাইল আপডেট' : '👤 Profile Updates', value: '2', icon: <UserIcon className="w-3.5 h-3.5 text-indigo-400" /> },
    { label: lang === 'bn' ? '⚠️ অ্যাকাউন্ট ডিলিট' : '⚠️ Account Deletion', value: '3', icon: <Trash2 className="w-3.5 h-3.5 text-red-400" /> },
    { label: lang === 'bn' ? '💳 ব্যালেন্স ও ওয়ালেট' : '💳 Wallet & Balance', value: '4', icon: <Wallet className="w-3.5 h-3.5 text-emerald-400" /> },
    { label: lang === 'bn' ? '📞 লাইভ এডমিন চ্যাট' : '📞 Speak to Live Admin', value: '5', icon: <HeadphonesIcon className="w-3.5 h-3.5 text-pink-400" /> }
  ];

  const isChatbotActive = !ticket || (!ticket.assignedTo && !ticket.chatbotEscalated);

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

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-brand-slate rounded-2xl mb-4 border border-brand-surface">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-brand-surface rounded-full flex items-center justify-center text-brand-amber font-bold">
              {ticket?.assignedTo ? 'A' : ticket?.chatbotEscalated ? '🚨' : '🤖'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-brand-slate rounded-full" />
          </div>
          <div>
            <h3 className="font-bold text-cream text-sm">
              {!ticket ? 'Live Support' : ticket.assignedTo ? 'Agent Connected' : ticket.chatbotEscalated ? 'Escalating to Human...' : '24/7 Smart Bot Active'}
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-gray-teal font-bold">{ticket?.subject || 'Ask us anything'}</p>
          </div>
        </div>
      </div>

      {/* Chat Engine */}
      <div className="flex-1 bg-brand-slate rounded-[32px] overflow-y-auto mb-4 border border-brand-surface p-4 space-y-4 shadow-inner flex flex-col">
        {!ticket ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
             <div className="w-16 h-16 bg-brand-amber/10 rounded-full flex items-center justify-center mb-4 border border-brand-amber/20 shadow-inner animate-bounce">
               <Bot className="w-8 h-8 text-brand-amber" />
             </div>
             <h2 className="text-cream font-black text-lg uppercase tracking-wider mb-2">MistriGO Smart Support</h2>
             <p className="text-gray-teal text-sm max-w-[250px] mb-6">Send a message or pick an interactive option below to start instant automated troubleshooting!</p>
             
             {/* Large welcome buttons */}
             <div className="w-full max-w-sm space-y-2.5">
               {quickReplies.map((qr) => (
                 <button
                   key={qr.value}
                   onClick={() => sendQuickReply(qr.value, qr.label)}
                   className="w-full flex items-center justify-between p-3.5 bg-brand-dark hover:bg-brand-surface rounded-2xl border border-brand-surface/40 hover:border-brand-amber text-cream font-bold text-xs transition-all text-left shadow"
                 >
                   <div className="flex items-center gap-3">
                     <span className="p-2 bg-brand-slate rounded-xl">{qr.icon}</span>
                     <span>{qr.label}</span>
                   </div>
                   <span className="text-[9px] uppercase tracking-widest text-brand-amber font-extrabold px-2 py-0.5 bg-brand-amber/10 rounded">ASK</span>
                 </button>
               ))}
             </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-amber bg-brand-amber/10 px-4 py-1.5 rounded-full border border-brand-amber/20">
                Ticket #{ticket.ticketId.slice(-6).toUpperCase()} Active
              </span>
            </div>
            
            {messages.map((msg) => {
              const isMe = msg.senderType !== 'admin' && msg.senderType !== 'chatbot';
              const isBot = msg.senderType === 'chatbot';
              return (
                <div key={msg.messageId} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {isBot ? (
                    <div className="flex gap-2 max-w-[85%] items-start">
                      <div className="w-8 h-8 rounded-full bg-brand-surface border border-slate-700/60 flex items-center justify-center text-sm shrink-0">
                        🤖
                      </div>
                      <div className="bg-brand-surface/80 text-cream rounded-2xl rounded-tl-sm border border-slate-700 p-3.5 shadow-lg space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-teal font-extrabold text-[9px] uppercase tracking-wider mb-1">
                          <span>MistriGO 24/7 Helper</span>
                        </div>
                        {renderMessageText(msg.text)}
                      </div>
                    </div>
                  ) : (
                    <div className={`max-w-[85%] p-3.5 rounded-2xl ${isMe ? 'bg-brand-amber text-brand-dark rounded-tr-sm shadow-lg shadow-brand-amber/20' : 'bg-brand-surface text-cream rounded-tl-sm border border-brand-surface'}`}>
                      {msg.attachments?.map((url, i) => (
                        <img key={i} src={url} alt="attachment" className="w-full rounded-xl mb-2 object-cover" />
                      ))}
                      <p className="text-sm font-medium whitespace-pre-line">{msg.text}</p>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Interactive Quick Replies in Active Chat */}
      {ticket && isChatbotActive && (
        <div className="mb-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-amber px-2 flex items-center gap-1.5 animate-pulse">
            <span>🤖</span>
            <span>Interactive Quick-Replies (Select to Ask):</span>
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-brand-surface">
            {quickReplies.map((qr) => (
              <button
                key={qr.value}
                onClick={() => sendQuickReply(qr.value, qr.label)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-slate hover:bg-brand-surface border border-brand-surface text-cream hover:text-brand-amber rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm shrink-0"
              >
                {qr.icon}
                <span>{qr.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
          className="flex-1 bg-transparent border-none text-sm text-cream placeholder-gray-teal focus:ring-0 px-2 outline-none"
        />
        <button onClick={sendMessage} disabled={!newMessage.trim()} className="p-3.5 bg-brand-amber text-brand-dark rounded-2xl disabled:opacity-50 shadow-lg shadow-brand-amber/20">
          <SendHorizonal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
