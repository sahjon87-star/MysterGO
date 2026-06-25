import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import cors from "cors";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

dotenv.config();

// Initialize Firebase Admin SDK
let adminApp;
if (getApps().length === 0) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "rajmistri-1";
  
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = cert(serviceAccount);
      console.log("Firebase Admin initialized with Service Account credentials.");
    } catch (e) {
      console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON.");
    }
  }

  adminApp = initializeApp({
    projectId: projectId,
    ...(credential ? { credential } : {})
  });
} else {
  adminApp = getApp();
}

const databaseId = process.env.VITE_FIRESTORE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID;
const dbAdmin = databaseId && databaseId.trim() !== "" ? getFirestore(adminApp, databaseId) : getFirestore(adminApp);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Customizable Market Rates & Guidelines for Bangladesh Construction
const BANGLADESH_CONSTRUCTION_RATES = {
  brickPricePerPc: 13, // BDT (ইট প্রতি পিস)
  cementPricePerBag: 550, // BDT (সিমেন্ট প্রতি ব্যাগ)
  sandPricePerCFT: 50, // BDT (বালু প্রতি সিএফটি)
  stonePricePerCFT: 130, // BDT (পাথর/খোয়া প্রতি সিএফটি)
  rebarPricePerKg: 96, // BDT (রড প্রতি কেজি)
  laborRateRajMistri: 900, // BDT (রাজমিস্ত্রি দৈনিক মজুরি)
  laborRateAssistant: 650, // BDT (যোগালি দৈনিক মজুরি)
  typicalBrands: {
    cement: ["Shah Cement (শাহ সিমেন্ট)", "Bashundhara Cement (বসুন্ধরা সিমেন্ট)", "Seven Rings Cement (সেভেন রিংস সিমেন্ট)", "Fresh Cement (ফ্রেস সিমেন্ট)"],
    rebar: ["BSRM (বিএসআরএম)", "AKS (একেএস)", "KSRM (কেএসআরএম)"]
  },
  aiSystemInstruction: `আপনি MistriGO (মিস্ত্রিগো) অ্যাপের একজন পেশাদার সিভিল ইঞ্জিনিয়ারিং এবং কনস্ট্রাকশন এস্টিমেটর এআই অ্যাসিস্ট্যান্ট। 
ইউজারের প্রদানকৃত ক্যালকুলেটর ইনপুট এবং আউটপুট ডেটার উপর ভিত্তি করে একটি বিস্তারিত এবং সহজবোধ্য খরচের হিসাব বাংলা ভাষায় তৈরি করুন।

আপনার উত্তরটিতে নিচের বিষয়গুলো অন্তর্ভুক্ত থাকতে হবে:
১. মোট আনুমানিক খরচ (বাংলা টাকায় / BDT): দেয়া সামগ্রীর দাম ও বাজার দর অনুযায়ী হিসাব করে মোট খরচ বের করুন। এবং হিসাবটির সংক্ষিপ্ত ব্যাখ্যা দিন।
২. ব্র্যান্ডের পরামর্শ: বাংলাদেশে প্রচলিত শীর্ষস্থানীয় এবং নির্ভরযোগ্য ব্র্যান্ডের নাম উল্লেখ করুন (যেমন সিমেন্ট বা রডের জন্য)।
৩. শ্রমিক বা মিস্ত্রিদের প্রয়োজনীয়তা: কাজটি করতে কতজন রাজমিস্ত্রি (Raj Mistri) এবং সহকারী বা জোগালি (Jogali) লাগতে পারে তার একটি ধারণা দিন।
৪. কিছু দরকারী টিপস যা গুণগত মান উন্নত করতে কাজে লাগবে।

উত্তরটি বিনয়ী, প্রফেশনাল এবং সম্পূর্ণ বাংলা ভাষায় হতে হবে।`
};

// Helper to retry transient GenAI failures with exponential backoff
async function retryWithBackoff<T = any>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const errMsg = err?.message || err?.toString() || "";
      const isTransient = 
        err?.status === "UNAVAILABLE" || 
        err?.status === 503 || 
        err?.code === 503 || 
        errMsg.includes("503") || 
        errMsg.includes("UNAVAILABLE") || 
        errMsg.includes("high demand") || 
        errMsg.includes("resource") || 
        errMsg.includes("rate limit") || 
        errMsg.includes("quota") ||
        errMsg.includes("busy") ||
        errMsg.includes("temporary");

      if (attempt >= retries || !isTransient) {
        throw err;
      }

      console.warn(`[Gemini-AI] Transient error encountered (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms... Error:`, errMsg);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }
}

// Helper functions to generate content with fallback models when under high demand (e.g., 503 errors)
async function generateContentWithFallback(genAI: any, options: {
  contents: any;
  config?: any;
}): Promise<any> {
  const models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
  let lastError = null;

  for (const modelName of models) {
    try {
      console.log(`[Gemini-AI] Attempting content generation with model: ${modelName}`);
      const response = await retryWithBackoff(() => 
        genAI.models.generateContent({
          model: modelName,
          contents: options.contents,
          config: options.config
        })
      );
      console.log(`[Gemini-AI] Success with model: ${modelName}`);
      return response;
    } catch (err: any) {
      console.warn(`[Gemini-AI] Model ${modelName} failed/busy after retries:`, err.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("All fallback models failed.");
}

async function generateContentStreamWithFallback(genAI: any, options: {
  contents: any;
  config?: any;
}): Promise<any> {
  const models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
  let lastError = null;

  for (const modelName of models) {
    try {
      console.log(`[Gemini-AI] Attempting content streaming with model: ${modelName}`);
      const response = await retryWithBackoff(() =>
        genAI.models.generateContentStream({
          model: modelName,
          contents: options.contents,
          config: options.config
        })
      );
      console.log(`[Gemini-AI] Stream started successfully with model: ${modelName}`);
      return response;
    } catch (err: any) {
      console.warn(`[Gemini-AI] Model ${modelName} stream failed/busy after retries:`, err.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("All stream fallback models failed.");
}

// Rates Endpoint
app.get("/api/calculator/rates", (req, res) => {
  res.json(BANGLADESH_CONSTRUCTION_RATES);
});

// Geocode Proxy Endpoint
app.get("/api/geocode", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });
    
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
      headers: {
        'User-Agent': 'MistriGO-App/1.0',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: "Nominatim error" });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Geocode error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Estimation Endpoint
app.post("/api/calculator/estimate", async (req, res) => {
  try {
    const { tab, inputs, results } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    let prompt = "";
    if (tab === "concrete") {
      prompt = `কনস্ট্রাকশন টাইপ: কংক্রিট স্ল্যাব / ঢালাই (Concrete Casting).
ইউজার ইনপুটসমূহ:
- দৈর্ঘ্য: ${inputs.concreteLength} ফুট
- প্রস্থ: ${inputs.concreteWidth} ফুট
- পুরুত্ব: ${inputs.concreteThickness} ইঞ্চি
- মিশ্রণ অনুপাত: ${inputs.concreteRatio}
- রড/Rebar অনুপাত: ${inputs.rebarPercentage}%

হিসাবকৃত আউটপুট ম্যাটেরিয়ালসমূহ:
- স্ল্যাব আয়তন: ${results.volume} CFT
- সিমেন্ট ব্যাগ: ${results.cementBags} টি
- বালু পরিমাণ: ${results.sand} CFT
- পাথর/Aggregates পরিমাণ: ${results.aggregate} CFT
- রড/Rebar ওজন: ${results.rebar} Kg

অনুগ্রহ করে বর্তমান বাজার মূল্য অনুযায়ী খরচের একটি সুন্দর সামারি রিপোর্ট এবং গাইডলাইন দিন।
বর্তমান বাজারের কিছু তথ্য:
- সিমেন্ট ব্যাগ: ${BANGLADESH_CONSTRUCTION_RATES.cementPricePerBag} BDT (১ ব্যাগ)
- বালু প্রতি CFT: ${BANGLADESH_CONSTRUCTION_RATES.sandPricePerCFT} BDT
- পাথর প্রতি CFT: ${BANGLADESH_CONSTRUCTION_RATES.stonePricePerCFT} BDT
- রড প্রতি Kg: ${BANGLADESH_CONSTRUCTION_RATES.rebarPricePerKg} BDT
- রাজমিস্ত্রি দৈনিক মজুরি: ${BANGLADESH_CONSTRUCTION_RATES.laborRateRajMistri} BDT
- জোগাল সহকারী দৈনিক মজুরি: ${BANGLADESH_CONSTRUCTION_RATES.laborRateAssistant} BDT
- প্রস্তাবিত সিমেন্ট ব্র্যান্ডস: ${BANGLADESH_CONSTRUCTION_RATES.typicalBrands.cement.join(', ')}
- প্রস্তাবিত রড ব্র্যান্ডস: ${BANGLADESH_CONSTRUCTION_RATES.typicalBrands.rebar.join(', ')}
`;
    } else if (tab === "brickwork") {
      prompt = `কনস্ট্রাকশন টাইপ: ইটের দেয়াল গাঁথুনি (Brick Wall Construction).
ইউজার ইনপুটসমূহ:
- দৈর্ঘ্য: ${inputs.brickLength} ফুট
- উচ্চতা: ${inputs.brickHeight} ফুট
- দেয়াল পুরুত্ব: ${inputs.brickThickness} ইঞ্চি
- মশলা অনুপাত: ${inputs.brickRatio}

হিসাবকৃত আউটপুট ম্যাটেরিয়ালসমূহ:
- দেয়াল ক্ষেত্রফল: ${results.area} SFT
- প্রয়োজনীয় ইটের সংখ্যা: ${results.bricks} টি
- সিমেন্ট ব্যাগ: ${results.cementBags} টি
- বালু পরিমাণ: ${results.sand} CFT

অনুগ্রহ করে বর্তমান বাজার মূল্য অনুযায়ী খরচের একটি সুন্দর সামারি রিপোর্ট এবং গাইডলাইন দিন।
বর্তমান বাজারের কিছু তথ্য:
- ইট প্রতি পিস: ${BANGLADESH_CONSTRUCTION_RATES.brickPricePerPc} BDT
- সিমেন্ট ব্যাগ: ${BANGLADESH_CONSTRUCTION_RATES.cementPricePerBag} BDT (১ ব্যাগ)
- বালু প্রতি CFT: ${BANGLADESH_CONSTRUCTION_RATES.sandPricePerCFT} BDT
- রাজমিস্ত্রি দৈনিক মজুরি: ${BANGLADESH_CONSTRUCTION_RATES.laborRateRajMistri} BDT
- জোগাল সহকারী দৈনিক মজুরি: ${BANGLADESH_CONSTRUCTION_RATES.laborRateAssistant} BDT
`;
    } else if (tab === "plaster") {
      prompt = `কনস্ট্রাকশন টাইপ: দেয়াল প্লাস্টার (Wall Plastering).
ইউজার ইনপুটসমূহ:
- মোট ক্ষেত্রফল: ${inputs.plasterArea} SFT
- প্লাস্টার পুরুত্ব: ${inputs.plasterThickness} ইঞ্চি
- মশলা অনুপাত: ${inputs.plasterRatio}

হিসাবকৃত আউটপুট ম্যাটেরিয়ালসমূহ:
- প্লাস্টার ভেজা আয়তন: ${results.volume} CFT
- সিমেন্ট ব্যাগ: ${results.cementBags} টি
- বালু পরিমাণ: ${results.sand} CFT

অনুগ্রহ করে বর্তমান বাজার মূল্য অনুযায়ী খরচের একটি সুন্দর সামারি রিপোর্ট এবং গাইডলাইন দিন।
বর্তমান বাজারের কিছু তথ্য:
- সিমেন্ট ব্যাগ: ${BANGLADESH_CONSTRUCTION_RATES.cementPricePerBag} BDT
- বালু প্রতি CFT: ${BANGLADESH_CONSTRUCTION_RATES.sandPricePerCFT} BDT
- রাজমিস্ত্রি দৈনিক মজুরি: ${BANGLADESH_CONSTRUCTION_RATES.laborRateRajMistri} BDT
- জোগাল সহকারী দৈনিক মজুরি: ${BANGLADESH_CONSTRUCTION_RATES.laborRateAssistant} BDT
`;
    }

    const response = await generateContentWithFallback(genAI, {
      contents: prompt,
      config: {
        systemInstruction: BANGLADESH_CONSTRUCTION_RATES.aiSystemInstruction
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Estimate API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Gemini API Route
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt, config, isTTS } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    if (isTTS) {
      const response = await retryWithBackoff(() => 
        genAI.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseModalities: ["AUDIO"],
            ...config
          }
        })
      );

      res.json(response);
    } else {
      const response = await generateContentWithFallback(genAI, {
        contents: prompt
      });
      res.json({ text: response.text });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Streaming version for suggestions
app.post("/api/gemini/stream", async (req, res) => {
  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const response = await generateContentStreamWithFallback(genAI, {
      contents: prompt
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of response) {
      const chunkText = chunk.text;
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Auth middleware for secure ledger endpoints
const verifyToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// Secure Ledger API: POST /api/wallet/topup
app.post("/api/wallet/topup", verifyToken, async (req, res) => {
  try {
    const { userId, amount, method, trxId, name, phone, address, collection } = req.body;
    if (!userId || !amount || !trxId || !method) {
      return res.status(400).json({ error: "Missing required fields (amount, method, trxId)" });
    }

    if ((req as any).user.uid !== userId) {
      return res.status(403).json({ error: "Forbidden: Cannot top up another user's wallet" });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      return res.status(400).json({ error: "Minimum topup amount is ৳10" });
    }

    const targetCollection = collection || "users";
    const userRef = dbAdmin.collection(targetCollection).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // 1. Add pending transaction
    const txRef = dbAdmin.collection("transactions").doc();
    await txRef.set({
      userId,
      userName: name || userSnap.data()?.name || "",
      userPhone: phone || userSnap.data()?.phone || "",
      userAddress: address || userSnap.data()?.address || "",
      amount: numAmount,
      type: "credit",
      description: `Wallet Top up (via ${method})`,
      status: "pending", // Status is pending, admin must approve
      method: method,
      trxId: trxId,
      userCollection: targetCollection,
      createdAt: FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: "Topup request submitted. Pending admin approval." });
  } catch (error: any) {
    console.error("Topup Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Secure Ledger API: POST /api/jobs/complete
app.post("/api/jobs/complete", verifyToken, async (req, res) => {
  try {
    const { bookingId, providerId } = req.body;
    if (!bookingId || !providerId) {
      return res.status(400).json({ error: "Missing bookingId or providerId" });
    }

    if ((req as any).user.uid !== providerId) {
      return res.status(403).json({ error: "Forbidden: You can only complete your own jobs" });
    }

    const bookingRef = dbAdmin.collection("bookings").doc(bookingId);
    const providerRef = dbAdmin.collection("providers").doc(providerId);

    const [bookingSnap, providerSnap] = await Promise.all([
      bookingRef.get(),
      providerRef.get()
    ]);

    if (!bookingSnap.exists) {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (!providerSnap.exists) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const bookingData = bookingSnap.data()!;
    if (bookingData.providerId !== providerId) {
      return res.status(403).json({ error: "Forbidden: This booking belongs to another provider" });
    }
    if (bookingData.status === "completed") {
      return res.status(400).json({ error: "Booking is already completed" });
    }

    const earning = bookingData.providerEarning || bookingData.totalAmount || bookingData.price || 0;

    await dbAdmin.runTransaction(async (transaction) => {
      transaction.update(bookingRef, {
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      transaction.update(providerRef, {
        totalJobs: FieldValue.increment(1)
      });

      const txRef = dbAdmin.collection("transactions").doc();
      transaction.set(txRef, {
        userId: providerId,
        userName: providerSnap.data()?.name || "",
        amount: earning,
        type: "credit",
        description: `Job Completed: ${bookingData.service || "Mistri Service"}`,
        status: "pending",
        bookingId: bookingId,
        userCollection: "providers",
        createdAt: FieldValue.serverTimestamp()
      });

      // Notify customer if exists
      if (bookingData.customerId) {
        const notifyCustomerRef = dbAdmin.collection("notifications").doc();
        transaction.set(notifyCustomerRef, {
          userId: bookingData.customerId,
          title: "Service Completed",
          body: `Your service "${bookingData.service}" was marked as completed. Thank you for choosing MistriGO!`,
          type: "booking_update",
          read: false,
          createdAt: FieldValue.serverTimestamp()
        });
      }
    });

    const updatedProviderSnap = await providerRef.get();
    res.json({ success: true, balance: updatedProviderSnap.data()?.walletBalance || 0 });
  } catch (error: any) {
    if (error?.code === 7 || error?.message?.includes("PERMISSION_DENIED")) {
      console.warn("[Backend] Firebase Admin lacks permissions (likely preview environment). Falling back to client-side.");
      return res.status(501).json({ error: "Backend lacks Firestore permissions, use client fallback." });
    }
    console.error("Job Complete Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Secure Ledger API: POST /api/orders/complete
app.post("/api/orders/complete", verifyToken, async (req, res) => {
  try {
    const { orderId, shopId } = req.body;
    if (!orderId || !shopId) {
      return res.status(400).json({ error: "Missing orderId or shopId" });
    }

    if ((req as any).user.uid !== shopId) {
      return res.status(403).json({ error: "Forbidden: You can only complete your own shop's orders" });
    }

    const orderRef = dbAdmin.collection("orders").doc(orderId);
    const shopRef = dbAdmin.collection("shops").doc(shopId);

    const [orderSnap, shopSnap] = await Promise.all([
      orderRef.get(),
      shopRef.get()
    ]);

    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (!shopSnap.exists) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const orderData = orderSnap.data()!;
    if (orderData.shopId !== shopId) {
      return res.status(403).json({ error: "Forbidden: This order belongs to another shop" });
    }
    if (orderData.status === "delivered") {
      return res.status(400).json({ error: "Order is already delivered" });
    }

    const amount = orderData.totalAmount || 0;

    await dbAdmin.runTransaction(async (transaction) => {
      transaction.update(orderRef, {
        status: "delivered",
        deliveredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      transaction.update(shopRef, {
        walletBalance: FieldValue.increment(amount),
        totalOrders: FieldValue.increment(1)
      });

      const txRef = dbAdmin.collection("transactions").doc();
      transaction.set(txRef, {
        userId: shopId,
        userName: shopSnap.data()?.shopName || shopSnap.data()?.name || "",
        amount: amount,
        type: "credit",
        description: `Order Delivered: #${orderId.slice(-8).toUpperCase()}`,
        status: "approved",
        orderId: orderId,
        userCollection: "shops",
        createdAt: FieldValue.serverTimestamp()
      });

      // Notify customer if exists
      if (orderData.customerId) {
        const notifyCustomerRef = dbAdmin.collection("notifications").doc();
        transaction.set(notifyCustomerRef, {
          userId: orderData.customerId,
          title: "Order Delivered",
          body: `Your order #${orderId.slice(-8).toUpperCase()} from ${shopSnap.data()?.shopName || "MistriGO Shop"} has been delivered.`,
          type: "order_update",
          read: false,
          createdAt: FieldValue.serverTimestamp()
        });
      }
    });

    const updatedShopSnap = await shopRef.get();
    res.json({ success: true, balance: updatedShopSnap.data()?.walletBalance || 0 });
  } catch (error: any) {
    if (error?.code === 7 || error?.message?.includes("PERMISSION_DENIED")) {
      console.warn("[Backend] Firebase Admin lacks permissions (likely preview environment). Falling back to client-side.");
      return res.status(501).json({ error: "Backend lacks Firestore permissions, use client fallback." });
    }
    console.error("Order Complete Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Secure Ledger API: POST /api/referrals/claim
app.post("/api/referrals/claim", verifyToken, async (req, res) => {
  try {
    const { referralCode, newUserId, newUserRole, newUserName } = req.body;
    if (!referralCode || !newUserId) {
      return res.status(400).json({ error: "Missing referralCode or newUserId" });
    }

    if ((req as any).user.uid !== newUserId) {
      return res.status(403).json({ error: "Forbidden: Cannot claim referral for another user" });
    }

    const cleanCode = referralCode.trim().toUpperCase();
    if (!cleanCode.startsWith("MGO-")) {
      return res.status(400).json({ error: "Invalid referral code prefix. Must start with MGO-." });
    }

    const settingsRef = dbAdmin.collection("settings").doc("system_config");
    const settingsSnap = await settingsRef.get();
    const settingsData = settingsSnap.exists ? settingsSnap.data() : null;
    const isReferralEnabled = settingsData?.isReferralEnabled !== false;
    const rewardAmount = parseFloat(settingsData?.referralRewardAmount || "20") || 20;

    if (!isReferralEnabled) {
      return res.status(400).json({ error: "Referral system is currently offline." });
    }

    const newUserCollection = newUserRole === "provider" ? "providers" : newUserRole === "shop_owner" ? "shops" : "users";
    
    // Idempotency check: see if user already claimed a referral
    const newUserRef = dbAdmin.collection(newUserCollection).doc(newUserId);
    const newUserSnap = await newUserRef.get();
    
    if (newUserSnap.exists && newUserSnap.data()?.referredBy) {
      return res.status(400).json({ error: "Referral already claimed." });
    }

    const collections = ["providers", "users", "shops"];
    let referrerDoc: any = null;
    let referrerCollection = "";

    for (const coll of collections) {
      const snap = await dbAdmin.collection(coll).where("referralCode", "==", cleanCode).limit(1).get();
      if (!snap.empty) {
        referrerDoc = snap.docs[0];
        referrerCollection = coll;
        break;
      }
    }

    if (!referrerDoc) {
      return res.status(404).json({ error: "Referral code not found." });
    }

    if (referrerDoc.id === newUserId) {
      return res.status(400).json({ error: "Self-referral is blocked." });
    }

    await dbAdmin.runTransaction(async (transaction) => {
      // Re-read inside transaction to ensure concurrency safety
      const txNewUserSnap = await transaction.get(newUserRef);
      if (txNewUserSnap.exists && txNewUserSnap.data()?.referredBy) {
        throw new Error("Referral already claimed.");
      }
      // 1. Credit Referrer
      transaction.update(dbAdmin.collection(referrerCollection).doc(referrerDoc.id), {
        walletBalance: FieldValue.increment(rewardAmount)
      });

      // 2. Credit New User & Link Referral
      transaction.update(dbAdmin.collection(newUserCollection).doc(newUserId), {
        walletBalance: FieldValue.increment(rewardAmount),
        referredBy: referrerDoc.id,
        referredByCollection: referrerCollection
      });

      // 3. Referrer Transaction Log
      const refTxRef = dbAdmin.collection("transactions").doc();
      transaction.set(refTxRef, {
        userId: referrerDoc.id,
        userName: referrerDoc.data()?.name || "MistriGO user",
        amount: rewardAmount,
        type: "credit",
        description: `Referral Bonus: ${newUserName || "New User"}`,
        status: "approved",
        userCollection: referrerCollection,
        createdAt: FieldValue.serverTimestamp()
      });

      // 4. New User Sign-up Log
      const newUserTxRef = dbAdmin.collection("transactions").doc();
      transaction.set(newUserTxRef, {
        userId: newUserId,
        userName: newUserName || "New User",
        amount: rewardAmount,
        type: "credit",
        description: `Sign-up Referral Bonus (Code: ${cleanCode})`,
        status: "approved",
        userCollection: newUserCollection,
        createdAt: FieldValue.serverTimestamp()
      });

      // 5. Referrer Notification
      const refNotifyRef = dbAdmin.collection("notifications").doc();
      transaction.set(refNotifyRef, {
        userId: referrerDoc.id,
        title: "Referral Reward Received!",
        body: `You have been credited ৳${rewardAmount} for inviting ${newUserName || "a new user"} to MistriGO.`,
        type: "wallet",
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });

      // 6. New User Notification
      const userNotifyRef = dbAdmin.collection("notifications").doc();
      transaction.set(userNotifyRef, {
        userId: newUserId,
        title: "Referral Reward Claimed!",
        body: `Welcome to MistriGO! You received ৳${rewardAmount} sign-up bonus from code ${cleanCode}.`,
        type: "wallet",
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });
    });

    res.json({ success: true, rewardAmount, referrerId: referrerDoc.id });
  } catch (error: any) {
    console.error("Referral Claim Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
