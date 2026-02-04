# Finternet API Integration - Direct API Calls

## The 3 Finternet API Calls You Need

Based on your requirement, here are the exact 3 Finternet API calls and how they integrate:

---

## Call 1️⃣: Create Payment Intent (Single Shared Pool)

**Endpoint:**

```
POST https://api.fmm.finternetlab.io/api/v1/payment-intents
```

**Our Backend Implementation:**

```javascript
// POST /groups/:groupId/create-payment-intent
const finternetResponse = await fetch(
  "https://api.fmm.finternetlab.io/api/v1/payment-intents",
  {
    method: "POST",
    headers: {
      "X-API-Key": process.env.FINTERNET_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: "6000", // Total pool (3 × 2000)
      currency: "USDC",
      type: "DELIVERY_VS_PAYMENT",
      settlementMethod: "OFF_RAMP_MOCK",
      settlementDestination: "POOL_abc123xyz", // Group wallet ID
      metadata: {
        releaseType: "MILESTONE_LOCKED",
        autoRelease: true,
        groupId: "group_123",
        payerType: "MULTIPLE_CONTRIBUTORS",
        expectedContributors: 3,
      },
    }),
  },
);

const intentData = await finternetResponse.json();
// Response:
// {
//   "data": {
//     "id": "intent_c4721336-8e51-45a3-a507-9eff916b63a8",
//     "amount": "6000",
//     "paymentUrl": "https://api.fmm.finternetlab.io/payment/intent_c4721336...",
//     "status": "INITIATED"
//   }
// }
```

**Frontend Call:**

```javascript
// User: Admin
// Step 1 in GroupPaymentFlow component

const response = await axios.post(
  "http://localhost:7777/groups/group_123/create-payment-intent",
  { totalAmount: 6000, numParticipants: 3 },
  { withCredentials: true },
);

// Get the payment URL to share with all participants
const paymentUrl = response.data.poolUrl;
// "https://api.fmm.finternetlab.io/payment/intent_c4721336..."
```

**What Happens:**

- ✅ Creates ONE shared escrow account for 6000 USDC
- ✅ All 3 users will use the SAME payment URL
- ✅ Payment intent ID stored in `group.finternetIntentId`
- ✅ Admin gets `paymentUrl` to share with participants

---

## Call 2️⃣: Create Milestones (Define Payment Phases)

**Endpoint:**

```
POST https://api.fmm.finternetlab.io/api/v1/payment-intents/{intentId}/escrow/milestones
```

**Our Backend Implementation:**

```javascript
// POST /groups/:groupId/create-milestone
// Called 3 times (once per milestone)

for (const milestone of milestones) {
  const finternetResponse = await fetch(
    `https://api.fmm.finternetlab.io/api/v1/payment-intents/${intentId}/escrow/milestones`,
    {
      method: "POST",
      headers: {
        "X-API-Key": process.env.FINTERNET_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        milestoneIndex: 0, // Sequential: 0, 1, 2, ...
        description: "Phase 1 - Planning",
        amount: "1800", // Amount to release
        percentage: 30, // % of total pool
      }),
    },
  );

  const milestoneData = await finternetResponse.json();
  // Response for each milestone:
  // {
  //   "data": {
  //     "id": "milestone_2ec266fc-2775-4b6b-be98-10d61559c208",
  //     "milestoneIndex": 0,
  //     "status": "PENDING",
  //     "amount": "1800"
  //   }
  // }
}

// Example: All 3 milestones in one call
const milestones = [
  {
    milestoneIndex: 0,
    description: "Phase 1 - Planning (30%)",
    amount: "1800",
    percentage: 30,
  },
  {
    milestoneIndex: 1,
    description: "Phase 2 - Execution (40%)",
    amount: "2400",
    percentage: 40,
  },
  {
    milestoneIndex: 2,
    description: "Phase 3 - Delivery (30%)",
    amount: "1800",
    percentage: 30,
  },
];
```

**Frontend Call:**

```javascript
// User: Admin
// Step 6 in MilestoneTracker component

const response = await axios.post(
  "http://localhost:7777/groups/group_123/create-milestone",
  {
    milestones: [
      {
        milestoneIndex: 0,
        description: "Planning",
        amount: 1800,
        percentage: 30,
      },
      {
        milestoneIndex: 1,
        description: "Execution",
        amount: 2400,
        percentage: 40,
      },
      {
        milestoneIndex: 2,
        description: "Delivery",
        amount: 1800,
        percentage: 30,
      },
    ],
  },
  { withCredentials: true },
);

// Response includes milestone IDs for later release
```

**What Happens:**

- ✅ Creates 3 milestone "checkpoints" within the same escrow
- ✅ Total amounts add up to pool total (1800 + 2400 + 1800 = 6000)
- ✅ All milestones start as PENDING
- ✅ Milestones must be completed in order (0 → 1 → 2)

---

## Call 3️⃣: Complete Milestone & Release Funds

**Endpoint:**

```
POST https://api.fmm.finternetlab.io/api/v1/payment-intents/{intentId}/escrow/milestones/{milestoneId}/complete
```

**Our Backend Implementation:**

```javascript
// POST /groups/:groupId/release-milestone
// Called once per milestone, in sequence

const completeResponse = await fetch(
  `https://api.fmm.finternetlab.io/api/v1/payment-intents/${intentId}/escrow/milestones/${milestoneId}/complete`,
  {
    method: "POST",
    headers: {
      "X-API-Key": process.env.FINTERNET_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      completedBy: "admin_wallet_address_or_id",
      completionProof: "Milestone 0 completed for group xyz",
      completionProofURI: "https://your-app.com/groups/group_123/milestone/0",
    }),
  },
);

const result = await completeResponse.json();
// Response:
// {
//   "object": "milestone",
//   "status": "completed"
// }

// After this API call:
// ✅ Milestone status changes from PENDING to RELEASED
// ✅ 1800 USDC is released from the escrow pool
// ✅ Auto-settlement scheduled to off-ramp merchant account
```

**Frontend Call:**

```javascript
// User: Admin
// Step 7 in MilestoneTracker component

const response = await axios.post(
  "http://localhost:7777/groups/group_123/release-milestone",
  {
    milestoneId: "milestone_2ec266fc-2775-4b6b-be98-10d61559c208",
    milestoneIndex: 0,
  },
  { withCredentials: true },
);

// Response includes distribution to each user:
// {
//   "success": true,
//   "milestone": {
//     "index": 0,
//     "totalReleased": 1800,
//     "perUserAmount": 600  // 1800 ÷ 3 users
//   },
//   "distributions": [
//     { user: "user_A", amount: 600 },
//     { user: "user_B", amount: 600 },
//     { user: "user_C", amount: 600 }
//   ]
// }
```

**What Happens:**

- ✅ Milestone 0: Release 1800 → 600 to each user
- ✅ Milestone 1: Release 2400 → 800 to each user
- ✅ Milestone 2: Release 1800 → 600 to each user
- ✅ Total per user: 600 + 800 + 600 = 2000 ✅

---

## Real-World Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Day 1: GROUP CREATION                                           │
└─────────────────────────────────────────────────────────────────┘

  Admin creates group "Trip Fund" with:
  - Pool Amount: 6000 USDC
  - Participants: User A, B, C

  ↓ Admin clicks "Create Payment Intent"

  Our API → Finternet API Call #1
  ┌──────────────────────────────────────────────────────────────┐
  │ POST /payment-intents                                        │
  │ {                                                             │
  │   amount: "6000",                                             │
  │   releaseType: "MILESTONE_LOCKED",                            │
  │   payerType: "MULTIPLE_CONTRIBUTORS"                          │
  │ }                                                             │
  └──────────────────────────────────────────────────────────────┘

  Response: intent_c4721336-8e51-45a3-a507-9eff916b63a8
  ↓
  Admin gets shared payment link:
  https://api.fmm.finternetlab.io/payment/intent_c4721336...


┌─────────────────────────────────────────────────────────────────┐
│ Day 2: PAYMENT COLLECTION                                       │
└─────────────────────────────────────────────────────────────────┘

  All 3 users share SAME payment URL

  User A: Pays 2000 ✅ (Status: PROCESSING)
  User B: Pays 2000 ✅ (Total: 4000)
  User C: Pays 2000 ✅ (Total: 6000)

  Pool Status: SUCCEEDED (verified via GET /payment-intents/{id})


┌─────────────────────────────────────────────────────────────────┐
│ Day 3: CREATE MILESTONES                                        │
└─────────────────────────────────────────────────────────────────┘

  Admin clicks "Create Milestones"

  Our API → Finternet API Call #2 (3 times, one per milestone)
  ┌──────────────────────────────────────────────────────────────┐
  │ POST /payment-intents/{intentId}/escrow/milestones            │
  │                                                               │
  │ Milestone 0: { index: 0, amount: "1800", percentage: 30 }    │
  │ Milestone 1: { index: 1, amount: "2400", percentage: 40 }    │
  │ Milestone 2: { index: 2, amount: "1800", percentage: 30 }    │
  │                                                               │
  │ Total: 6000 ✅                                                 │
  └──────────────────────────────────────────────────────────────┘

  Responses:
  - milestone_2ec266fc-2775-4b6b-be98-10d61559c208 (Milestone 0)
  - milestone_xyz789abcdef (Milestone 1)
  - milestone_abc456def (Milestone 2)


┌─────────────────────────────────────────────────────────────────┐
│ Day 14: RELEASE MILESTONE 0                                     │
└─────────────────────────────────────────────────────────────────┘

  Admin clicks "Release Milestone 0" (Work completed)

  Our API → Finternet API Call #3 (First of 3)
  ┌──────────────────────────────────────────────────────────────┐
  │ POST /payment-intents/{intentId}/escrow/milestones/           │
  │      {milestoneId}/complete                                  │
  │                                                               │
  │ {                                                             │
  │   completedBy: "admin_address",                               │
  │   completionProof: "Milestone 0 completed"                    │
  │ }                                                             │
  └──────────────────────────────────────────────────────────────┘

  Finternet Response: status: "completed"
  ↓
  Backend distributes:
  - User A: 600 ✅
  - User B: 600 ✅
  - User C: 600 ✅

  Pool Remaining: 4200 (2400 + 1800)


┌─────────────────────────────────────────────────────────────────┐
│ Day 21: RELEASE MILESTONE 1                                     │
└─────────────────────────────────────────────────────────────────┘

  Admin clicks "Release Milestone 1"

  Our API → Finternet API Call #3 (Second of 3)
  ┌──────────────────────────────────────────────────────────────┐
  │ POST /payment-intents/{intentId}/escrow/milestones/           │
  │      {milestoneId}/complete                                  │
  │                                                               │
  │ (Similar to Milestone 0)                                      │
  └──────────────────────────────────────────────────────────────┘

  Backend distributes:
  - User A: 800 ✅ (Total: 1400)
  - User B: 800 ✅ (Total: 1400)
  - User C: 800 ✅ (Total: 1400)

  Pool Remaining: 1800


┌─────────────────────────────────────────────────────────────────┐
│ Day 28: RELEASE MILESTONE 2 (FINAL)                             │
└─────────────────────────────────────────────────────────────────┘

  Admin clicks "Release Milestone 2"

  Our API → Finternet API Call #3 (Third of 3)
  ┌──────────────────────────────────────────────────────────────┐
  │ POST /payment-intents/{intentId}/escrow/milestones/           │
  │      {milestoneId}/complete                                  │
  │                                                               │
  │ (Similar to previous milestones)                              │
  └──────────────────────────────────────────────────────────────┘

  Backend distributes:
  - User A: 600 ✅ (Total: 2000) ✨
  - User B: 600 ✅ (Total: 2000) ✨
  - User C: 600 ✅ (Total: 2000) ✨

  Pool Status: FINAL ✅
  All funds released and distributed!
```

---

## Mapping Your URLs to Our Implementation

### Your 3 Finternet URLs

You provided:

```
1. https://api.fmm.finternetlab.io/api/v1/payment-intents
2. https://api.fmm.finternetlab.io/api/v1/payment-intents/intent_c4721336-8e51-45a3-a507-9eff916b63a8/escrow/milestones
3. https://api.fmm.finternetlab.io/api/v1/payment-intents/intent_c4721336-8e51-45a3-a507-9eff916b63a8/escrow/milestones/2ec266fc-2775-4b6b-be98-10d61559c208/complete
```

### Our Routes That Call Them

```
API #1 (Create Intent)
├─ Called by: POST /groups/:groupId/create-payment-intent
└─ When: Admin initializes pool for the group

API #2 (Create Milestones)
├─ Called by: POST /groups/:groupId/create-milestone
└─ When: Admin breaks down how to release funds

API #3 (Complete Milestone)
├─ Called by: POST /groups/:groupId/release-milestone
└─ When: Admin releases funds for completed work
```

---

## Transaction Sequence

```
1. Create Intent → Single escrow holds 6000
                 → All 3 users have SAME payment link

2. Users pay    → 2000 + 2000 + 2000 → Escrow SUCCEEDED

3. Create Milestones → Divide 6000 into 3 phases
                     → Milestone 0: 1800
                     → Milestone 1: 2400
                     → Milestone 2: 1800

4. Complete M0  → Release 1800 from escrow
                → Distribute: 600 to each user

5. Complete M1  → Release 2400 from escrow
                → Distribute: 800 to each user

6. Complete M2  → Release 1800 from escrow (FINAL)
                → Distribute: 600 to each user
                → All funds released: 2000 per user ✅
```

---

## Environment Variable

```bash
FINTERNET_API_KEY=sk_hackathon_6363ad2f4fe8db81d46787d9aeafb604
```

Used in header for all 3 API calls:

```javascript
headers: {
  "X-API-Key": process.env.FINTERNET_API_KEY,
  "Content-Type": "application/json"
}
```

---

## Summary

✅ **Call 1**: Creates ONE shared pool escrow (6000 USDC)
✅ **Call 2**: Creates 3 milestones within that pool (1800, 2400, 1800)
✅ **Call 3**: Releases each milestone sequentially, funds distributed equally

All integrated with your backend routes and frontend components!
