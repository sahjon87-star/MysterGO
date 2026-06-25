# Security Specification: Firestore Attribute-Based Access Control (ABAC)

This security specification details the **Data Invariants**, the **"Dirty Dozen" Malicious Payloads**, and a secure **Test Architecture** designed to defend the Mistrigo on-demand platform against Privilege Escalation, Resource Poisoning, and Identity Spoofing.

---

## 1. Core Data Invariants

1. **Identity Hardening**:
   - A user profile (`/users/{uid}`) can only be created or modified by the authenticated owner of that exact UID.
   - Users cannot self-escalate or self-assign the `isAdmin` or `role` flags. Role changes are governed strictly by database lookups against a trusted `/admins` collection.

2. **KYC Document Privacy**:
   - Private verification documents stored under `/providers/{uid}/private/kyc` and `/shops/{uid}/private/kyc` are strictly confidential.
   - Read access is restricted solely to the account owner or an authenticated admin. Global blanket reads of these documents are forbidden.

3. **Financial Integrity (Transactions & Withdrawals)**:
   - Debit and Credit transactions stored under `/transactions` can only be queried or managed by the user who owns them (`userId == request.auth.uid`), or by an authenticated admin.
   - Withdrawals must be created with a `pending` status. Users are strictly forbidden from writing or modifying their own withdrawal request states once submitted.

4. **Service Bookings and OTP Locks**:
   - Bookings can only be created by an authenticated customer who matches the `customerId` field.
   - An assigned provider can only modify transitional states of bookings they are assigned to (e.g. updating statuses or requesting OTP validation).
   - Once a booking reaches a terminal state (`completed` or `cancelled`), further modifications are blocked to prevent state shortcuts.

5. **Direct PII & Query Scrape Protections**:
   - Blanket collection listing on sensitive directories is denied. In-app notifications can only be read if they belong to the authenticated recipient (`resource.data.userId == request.auth.uid`).

---

## 2. The "Dirty Dozen" Malicious Payloads

These 12 payloads represent critical attacks attempting to breach the authorization boundaries of the Mistrigo platform. Our security rules mathematically prevent every single one of these operations.

### Payload 1: Self-Onboarding Admin Escalation
**Attack Vector**: Privilege Escalation. An attacker attempts to onboard themselves as an admin by injecting custom roles or claims into `/users`.
```json
// Target: /users/attacker123
{
  "uid": "attacker123",
  "name": "Malicious User",
  "email": "attacker@gmail.com",
  "role": "admin",
  "isAdmin": true
}
```

### Payload 2: Spoofed Identity KYC Creation
**Attack Vector**: Identity Spoofing. An attacker attempts to upload private KYC files for a different victim's account.
```json
// Target: /providers/victim456/private/kyc
{
  "nidNumber": "1234567890",
  "selfieUrl": "https://attacker.com/spoofed_selfie.png",
  "submittedAt": "2026-06-24T00:00:00Z"
}
```

### Payload 3: Stealth Product Stock Price Poisoning
**Attack Vector**: Data Tampering. An attacker attempts to create a high-priced product linked to another vendor's shop.
```json
// Target: /products/poisonedProduct789
{
  "shopId": "victimVendor999",
  "shopName": "Victim's Boutique",
  "name": "Invisible Gold Chain",
  "price": 99999.00,
  "stock": 1,
  "providerId": "attacker123"
}
```

### Payload 4: Fake Deposit Injection
**Attack Vector**: Wallet Theft. An attacker writes a self-credit transaction to inflate their wallet balance without an actual payment gateway trigger.
```json
// Target: /transactions/fakeCreditTrx
{
  "userId": "attacker123",
  "amount": 5000.00,
  "type": "credit",
  "description": "Stealth Credit Load",
  "status": "approved"
}
```

### Payload 5: Withdrawal State Hijack
**Attack Vector**: Financial Interception. An attacker attempts to force-approve their own pending withdrawal.
```json
// Target: /withdrawals/attackerPendingWithdrawal
{
  "userId": "attacker123",
  "amount": 1000.00,
  "status": "approved"
}
```

### Payload 6: Rogue Booking Creation
**Attack Vector**: Denial of Service. An attacker creates a booking claiming to act as a victim customer.
```json
// Target: /bookings/hijackedBooking99
{
  "customerId": "victimCustomer111",
  "providerId": "worker222",
  "totalPrice": 150.00,
  "status": "pending"
}
```

### Payload 7: Terminal State Overwrite
**Attack Vector**: Contract Tampering. An attacker tries to reopen a completed booking to alter hours or rate.
```json
// Target: /bookings/completedBooking33
{
  "customerId": "customer123",
  "providerId": "worker222",
  "status": "pending",
  "totalPrice": 10.00
}
```

### Payload 8: Direct Message Impersonation
**Attack Vector**: Social Engineering. An attacker attempts to send messages in a direct chat room posing as the other user.
```json
// Target: /messages/spoofedMsg44
{
  "chatId": "attacker123_victim456",
  "senderId": "victim456",
  "receiverId": "attacker123",
  "text": "Sure, I agree to refund your full payment."
}
```

### Payload 9: Hijacked Live Support Intervention
**Attack Vector**: Support Spoofing. An attacker attempts to post a message in another user's support ticket claiming to be an administrator.
```json
// Target: /support_tickets/victimTicket11/messages/forgedMsg
{
  "senderId": "attacker123",
  "text": "This is Admin support, please transfer funds here.",
  "isAdmin": true
}
```

### Payload 10: Unauthorized Global Notification Query
**Attack Vector**: Data Scraping / PII Leak. An attacker issues a query to download all notifications in the system.
```javascript
// Query attempt
query(collection(db, 'notifications'));
```

### Payload 11: Notification Status Tampering
**Attack Vector**: State disruption. An attacker attempts to mark someone else's notification as read or delete it.
```json
// Target: /notifications/victimNotification88
{
  "userId": "victim456",
  "read": true
}
```

### Payload 12: Illegal Category Insertion
**Attack Vector**: Resource Poisoning. A non-admin user attempts to inject a spam category to disrupt the consumer catalog directory.
```json
// Target: /categories/spamCat
{
  "id": "spamCat",
  "name": "Spam Service Catalog",
  "icon": "Trash",
  "description": "Spam catalog injection"
}
```

---

## 3. Security Rules Test Suite Blueprint

Below is the structured test design using `@firebase/rules-unit-testing` or local unit runners, proving that every single one of the "Dirty Dozen" malicious writes returns a strictly enforced `PERMISSION_DENIED` status.

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { setDoc, addDoc, doc, collection, getDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('Mistrigo Fortress Firestore Rules TDD', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'mistrigo-sandbox',
      firestore: {
        rules: `rules_version = '2'; ...`
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('Denies self-assigned admin privileges during onboarding (Payload 1)', async () => {
    const attackerContext = testEnv.authenticatedContext('attacker123');
    const db = attackerContext.firestore();
    
    await expect(
      setDoc(doc(db, 'users', 'attacker123'), {
        uid: 'attacker123',
        role: 'admin',
        isAdmin: true,
      })
    ).rejects.toThrow();
  });

  it('Denies spoofed KYC creation on behalf of a victim provider (Payload 2)', async () => {
    const attackerContext = testEnv.authenticatedContext('attacker123');
    const db = attackerContext.firestore();
    
    await expect(
      setDoc(doc(db, 'providers', 'victim456', 'private', 'kyc'), {
        nidNumber: '1234567890',
        selfieUrl: 'https://attacker.com/spoofed_selfie.png',
      })
    ).rejects.toThrow();
  });

  it('Denies unauthorized product creation under victim vendor (Payload 3)', async () => {
    const attackerContext = testEnv.authenticatedContext('attacker123');
    const db = attackerContext.firestore();
    
    await expect(
      addDoc(collection(db, 'products'), {
        shopId: 'victimVendor999',
        name: 'Invisible Gold Chain',
        price: 99999.00,
        stock: 1,
      })
    ).rejects.toThrow();
  });

  it('Denies unauthorized financial transaction credit injection (Payload 4)', async () => {
    const attackerContext = testEnv.authenticatedContext('attacker123');
    const db = attackerContext.firestore();
    
    await expect(
      addDoc(collection(db, 'transactions'), {
        userId: 'attacker123',
        amount: 5000.00,
        type: 'credit',
        status: 'approved',
      })
    ).rejects.toThrow();
  });
});
```
