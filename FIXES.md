# MistriGO — Fix Changelog

## Security & Bug Fixes Applied (May 2026)

---

### 🚨 CRITICAL

#### C-1 — Hardcoded Gemini API Key Removed
**File:** `src/lib/gemini.ts`
- Removed `FALLBACK_GEMINI_API_KEY` export containing a live API key
- `getGeminiApiKey()` now returns `null` if no env key is set (instead of falling back to hardcoded)
- **Action required:** Revoke the old key in Google Cloud Console, generate a new one, set it as `GEMINI_API_KEY` in your project secrets

#### C-3 — Products Rule Fixed (Owner-Only Write)
**File:** `firestore.rules`
- Previously: Any authenticated user could edit/delete any product
- Fixed: `create` requires `providerId == request.auth.uid`; `update/delete` requires ownership or admin

#### C-4 — Shop Orders Rule Fixed (Participant-Only Update)
**File:** `firestore.rules`
- Previously: Any authenticated user could update any order's status
- Fixed: Update restricted to `customerId`, `shopId`, or admin only

#### C-5 — Transactions Rule Fixed (No Fake Credits)
**File:** `firestore.rules`
- Previously: Any authenticated user could create any transaction type
- Fixed: Clients can only create `debit` transactions for themselves; `update` is admin-only

---

### 🔴 HIGH

#### H-1 — Double Debit on Withdrawal Approval Fixed
**File:** `src/components/admin/AdminWithdrawals.tsx`
- Previously: Admin approval created a second debit transaction, causing duplicate entries in provider history
- Fixed: Approval no longer creates a new transaction — the debit already exists from when the provider submitted the request

#### H-2 — Provider Wallet Minimum ৳100 Withdrawal Validation Added
**File:** `src/components/provider/ProviderWallet.tsx`
- Previously: Provider could submit withdrawals of any amount (even ৳0.01)
- Fixed: Added `if (amount < 100) toast.error(...)` check matching CustomerWallet behavior

#### H-3 — ReferralPage Stats Now Live (from Firestore)
**File:** `src/components/shared/ReferralPage.tsx`
- Previously: Total Referrals, Earned Rewards, Pending were all hardcoded as `0`
- Fixed: Now subscribes to `referral_rewards` collection filtered by `referrerId == profile.uid`
- Shows real-time totals; pending shows `'...'` while loading

#### H-4 — Deprecated Firebase Persistence API Replaced
**File:** `src/lib/firebase.ts`
- Previously: Used `enableIndexedDbPersistence` (removed in Firebase v12+), causing silent runtime errors
- Fixed: Replaced with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` in `initializeFirestore` options
- Also removed unused diagnostic connection test (billed Firestore read on every page load)
- Also cleaned up unused `getAuth`, `getFirestore`, `setPersistence` imports

#### H-5 — Wrong Referral Share URL Domain Fixed
**File:** `src/components/shared/ReferralPage.tsx`
- Previously: Share URL pointed to `nexus-serv-bd.web.app` (old project)
- Fixed: Now uses `import.meta.env.VITE_APP_URL` with fallback to `https://rajmistri-1.web.app`
- Set `VITE_APP_URL=https://your-actual-domain.web.app` in `.env.local` for production

---

### 🟡 MEDIUM

#### M-1 — Notification Field Fixed (`message` → `body`)
**File:** `src/components/admin/AdminWithdrawals.tsx`
- Previously: Notifications created with `message:` field; `Notification` type expects `body:`
- Fixed: Both withdrawal approval and rejection notifications now use `body:` field
- Notifications will now display correctly in the notification panel

#### M-2 — Hardcoded Admin Email Removed from Firestore Rules
**File:** `firestore.rules`
- Previously: `isAdmin()` function hardcoded `sahjon87@gmail.com` (visible to anyone reading rules)
- Fixed: Removed the hardcoded email; now relies solely on `role == 'admin'` in user document
- **One-time setup:** Go to Firebase Console → Firestore → `users` collection → find your admin user's document → set `role: "admin"` manually

#### M-3 — AuthContext Login Speed Improved (Parallel getDoc)
**File:** `src/contexts/AuthContext.tsx`
- Previously: 3 sequential Firestore reads on login (users → providers → shops)
- Fixed: All 3 run in parallel with `Promise.all()` — login is ~2-3× faster on mobile

#### M-4 — Double Sort Removed in CustomerWallet
**File:** `src/components/customer/CustomerWallet.tsx`
- Previously: Transactions were sorted twice (once in snapshot handler, once in `useMemo`)
- Fixed: Removed redundant sort from snapshot handler; `useMemo` sort remains

---

### 🟢 MINOR

- Removed unused `orderBy` import from `AdminWithdrawals.tsx`
- `ReferralPage.tsx` referral code fallback changed from `NSBXXXXXX` to `MGO-XXXXXX`

---

## ⚠️ Post-Deploy Checklist

1. **Revoke old Gemini key** → https://console.cloud.google.com/apis/credentials
2. **Set admin role** in Firestore Console for your admin user: `users/{uid}.role = "admin"`
3. **Add env vars** in `.env.local`:
   ```
   GEMINI_API_KEY=your_new_key_here
   VITE_APP_URL=https://your-app.web.app
   VITE_IMGBB_API_KEY=your_imgbb_key_here
   ```
4. **Deploy Firestore rules**: `firebase deploy --only firestore:rules`
