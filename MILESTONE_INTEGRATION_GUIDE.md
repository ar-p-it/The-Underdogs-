# Milestone-Based Payment Integration - Step-by-Step Guide

## Overview

This implementation allows multiple users to pool money into a **single shared escrow**, then release funds incrementally via milestones. All users pay into the same Finternet payment intent.

---

## Architecture

```
User A (2000) ──┐
User B (2000) ──├──→ [SINGLE INTENT: 6000 USDC] ──→ ESCROW POOL
User C (2000) ──┘

When Milestone 1 Complete (Release 3000):
POOL (6000) → Release 3000 from Milestone 1
            → Distribute: 1000 to A, 1000 to B, 1000 to C
```

---

## Backend Implementation

### 1. **Updated Group Model** (`/BackEnd/src/models/group.js`)

Added new fields:

- `finternetIntentId`: Stores the shared payment intent ID
- `poolAmount`: Total amount for the shared pool
- `paymentStatus`: Track funding status (AWAITING_CONTRIBUTIONS, FUNDED, PROCESSING, SUCCEEDED, SETTLED, FINAL)
- `milestones[]`: Array of milestone objects with status tracking
- `distributions[]`: Track how released funds are distributed to users

### 2. **Backend Routes** (`/BackEnd/src/routes/groups.js`)

#### POST `/groups` - Create Group

- Creates group with pooled payment fields initialized
- Sets default pool amount based on per-person amount

#### POST `/groups/:groupId/create-payment-intent`

- **Called by**: Group admin only
- **What it does**: Creates a single shared Finternet payment intent
- **Parameters**:
  - `totalAmount`: Total pool amount (e.g., 6000 USDC for 3 users × 2000)
  - `numParticipants`: Expected number of contributors

**Example:**

```javascript
POST /groups/123/create-payment-intent
{
  "totalAmount": 6000,
  "numParticipants": 3
}

Response:
{
  "success": true,
  "intentId": "intent_c4721336...",
  "poolUrl": "https://api.fmm.finternetlab.io/payment/intent_c4721336..."
}
```

#### POST `/groups/:groupId/contribute`

- **Called by**: Any group member
- **What it does**: Registers their contribution amount, returns shared payment link
- **Parameters**:
  - `contributionAmount`: User's contribution (e.g., 2000)

**Example:**

```javascript
POST /groups/123/contribute
{
  "contributionAmount": 2000
}

Response:
{
  "success": true,
  "paymentUrl": "https://api.fmm.finternetlab.io/payment/intent_c4721336...",
  "yourAmount": 2000,
  "totalPoolTarget": 6000,
  "currentContributions": 4000  // 2 users have registered
}
```

**⚠️ KEY POINT**: All users receive the SAME `paymentUrl` to contribute to the single shared pool.

#### POST `/groups/:groupId/verify-pool`

- **Called by**: Anyone
- **What it does**: Checks if all contributions have been received
- **Returns**: Funding status, percentage funded

**Example:**

```javascript
POST /groups/123/verify-pool
{}

Response:
{
  "success": true,
  "message": "✅ Pool fully funded!",
  "totalAmount": 6000,
  "status": "FUNDED",
  "intentStatus": "SUCCEEDED"
}
```

#### POST `/groups/:groupId/create-milestone`

- **Called by**: Group admin only
- **What it does**: Creates milestones within the shared escrow
- **Parameters**:
  - `milestones[]`: Array of milestones with index, description, amount, percentage

**Example:**

```javascript
POST /groups/123/create-milestone
{
  "milestones": [
    {
      "milestoneIndex": 0,
      "description": "Phase 1 - Kickoff",
      "amount": 1800,
      "percentage": 30
    },
    {
      "milestoneIndex": 1,
      "description": "Phase 2 - Mid-point",
      "amount": 2400,
      "percentage": 40
    },
    {
      "milestoneIndex": 2,
      "description": "Phase 3 - Final",
      "amount": 1800,
      "percentage": 30
    }
  ]
}

Response:
{
  "success": true,
  "message": "Milestones created",
  "milestones": [
    {
      "finternetMilestoneId": "milestone_2ec266fc...",
      "index": 0,
      "status": "PENDING"
    },
    ...
  ]
}
```

#### POST `/groups/:groupId/release-milestone`

- **Called by**: Group admin only
- **What it does**: Releases funds from a milestone, distributes to all participants equally
- **Parameters**:
  - `milestoneId`: Finternet milestone ID
  - `milestoneIndex`: The milestone number

**Example:**

```javascript
POST /groups/123/release-milestone
{
  "milestoneId": "milestone_2ec266fc...",
  "milestoneIndex": 0
}

Response:
{
  "success": true,
  "message": "Released 1800 from milestone 0",
  "milestone": {
    "index": 0,
    "totalReleased": 1800,
    "perUserAmount": 600,  // 1800 ÷ 3 users
    "releasedAt": "2026-02-05T..."
  },
  "distributions": [
    {
      "user": "user_A_id",
      "milestoneIndex": 0,
      "amount": 600,
      "status": "RELEASED"
    },
    ...
  ]
}
```

---

## Frontend Components

### 1. **GroupPaymentFlow** (`/FrontEnd/src/components/GroupPaymentFlow.jsx`)

4-step payment flow:

1. **Step 1: Initialize Payment Pool**
   - Admin clicks "Create Payment Intent"
   - Creates single Finternet intent for entire group pool

2. **Step 2: Register Contributions**
   - Each user enters their contribution amount
   - System registers their amount in the group

3. **Step 3: Share Payment Link**
   - All users receive SAME payment URL
   - Share link with all participants
   - Users complete payment on that single URL

4. **Step 4: Verify Pool Status**
   - Click "Check Pool Status" to verify all payments received
   - Shows percentage funded

### 2. **MilestoneTracker** (`/FrontEnd/src/components/MilestoneTracker.jsx`)

Manage milestones after pool is funded:

1. **Create Milestones**
   - Admin creates milestone breakdown (e.g., 30/40/30)
   - Each milestone is created in Finternet

2. **View Milestones**
   - Shows all milestones with status
   - Displays amount per user when released

3. **Release Milestones**
   - Admin clicks "Release Funds" when work is complete
   - Funds are released and distributed equally

4. **Distribution History**
   - Table showing all released distributions
   - Track which milestone funds went to which users

---

## Complete User Flow

### Day 1: Group Creation

```
User A creates group "Trip Fund"
├─ Pool Amount: 6000 USDC (3 × 2000)
├─ Adds users B & C to group
└─ Creates Finternet payment intent
```

### Day 2: Users Contribute

```
User A contributes 2000 → Registers contribution
User B contributes 2000 → Registers contribution
User C contributes 2000 → Registers contribution

All 3 users use SAME payment URL to pay ✅
Pool reaches 6000 USDC → FUNDED status
```

### Day 3-14: Milestone Work

```
Admin creates 3 milestones:
├─ Milestone 0: 30% (1800) - "Planning phase"
├─ Milestone 1: 40% (2400) - "Execution"
└─ Milestone 2: 30% (1800) - "Delivery"
```

### Day 14: Release Milestone 0

```
Admin clicks "Release Milestone 0"
├─ Finternet releases 1800 from escrow
├─ System distributes: 600 to A, 600 to B, 600 to C
└─ Status: RELEASED ✅
```

### Day 21: Release Milestone 1

```
Admin clicks "Release Milestone 1"
├─ Finternet releases 2400 from escrow
├─ System distributes: 800 to A, 800 to B, 800 to C
└─ Status: RELEASED ✅
```

### Day 28: Release Milestone 2

```
Admin clicks "Release Milestone 2"
├─ Finternet releases final 1800 from escrow
├─ System distributes: 600 to A, 600 to B, 600 to C
└─ Pool Status: FINAL ✅
```

---

## Environment Variables (.env)

```bash
# Finternet
FINTERNET_API_KEY=sk_hackathon_6363ad2f4fe8db81d46787d9aeafb604
FINTERNET_BASE_URL=https://api.fmm.finternetlab.io/api/v1
FINTERNET_SETTLEMENT_WALLET=0x742d35Cc6634C0532925a3b844Bc9e7595f42318
```

---

## Data Model

### Group Document Structure

```javascript
{
  _id: ObjectId,
  name: "Trip Fund",
  poolAmount: 6000,
  paymentStatus: "FUNDED",
  finternetIntentId: "intent_c4721336-...",

  milestones: [
    {
      finternetMilestoneId: "milestone_2ec266fc-...",
      index: 0,
      description: "Phase 1",
      amount: 1800,
      status: "PENDING" | "COMPLETED" | "RELEASED"
    }
  ],

  distributions: [
    {
      user: ObjectId,
      milestoneIndex: 0,
      amount: 600,
      status: "RELEASED",
      releasedAt: Date
    }
  ],

  participants: [
    {
      user: ObjectId,
      depositAmount: 2000,
      deposited: true
    }
  ]
}
```

---

## Key Differences: Single Pool vs Multiple Intents

| Aspect              | ❌ Multiple Intents              | ✅ Single Intent               |
| ------------------- | -------------------------------- | ------------------------------ |
| **Payment Intents** | 3 separate intents (A, B, C)     | 1 shared intent for whole pool |
| **Payment Links**   | 3 different URLs                 | 1 URL for everyone             |
| **Fund Location**   | 3 separate escrow accounts       | 1 shared escrow pool           |
| **Releasing Funds** | Can't coordinate across accounts | Release from one pool          |
| **Distribution**    | Complex accounting               | Simple equal split             |
| **User Experience** | Confusing (3 links)              | Clear (1 link)                 |

---

## API Integration Summary

### Finternet APIs Used

1. **Create Payment Intent** (Create single pool)

   ```
   POST /api/v1/payment-intents
   ```

2. **Create Milestones** (Define payment phases)

   ```
   POST /api/v1/payment-intents/{intentId}/escrow/milestones
   ```

3. **Complete Milestone** (Release funds)

   ```
   POST /api/v1/payment-intents/{intentId}/escrow/milestones/{milestoneId}/complete
   ```

4. **Check Intent Status** (Verify pool funding)
   ```
   GET /api/v1/payment-intents/{intentId}
   ```

---

## Testing the Implementation

### Test Case 1: Group Creation

```bash
POST /groups
{
  "name": "Test Group",
  "depositAmountPerPerson": 2000,
  "currency": "USDC"
}
```

### Test Case 2: Create Payment Intent

```bash
POST /groups/{groupId}/create-payment-intent
{
  "totalAmount": 6000,
  "numParticipants": 3
}
```

### Test Case 3: Register Contributions

```bash
# User A
POST /groups/{groupId}/contribute
{ "contributionAmount": 2000 }

# User B (different token)
POST /groups/{groupId}/contribute
{ "contributionAmount": 2000 }

# User C (different token)
POST /groups/{groupId}/contribute
{ "contributionAmount": 2000 }
```

### Test Case 4: Create Milestones

```bash
POST /groups/{groupId}/create-milestone
{
  "milestones": [
    { "milestoneIndex": 0, "amount": 1800, "percentage": 30 },
    { "milestoneIndex": 1, "amount": 2400, "percentage": 40 },
    { "milestoneIndex": 2, "amount": 1800, "percentage": 30 }
  ]
}
```

### Test Case 5: Release Milestone

```bash
POST /groups/{groupId}/release-milestone
{
  "milestoneId": "{milestoneId}",
  "milestoneIndex": 0
}
```

---

## Security Notes

- ✅ Admin-only routes for payment intent and milestone release
- ✅ API key stored in environment variables (not exposed)
- ✅ User can only contribute to their own registered amount
- ✅ Sequential milestone completion (can't skip)
- ✅ Equal distribution (no manual splitting needed)

---

## Next Steps

1. ✅ Backend routes implemented
2. ✅ Frontend components created
3. 🔄 Test payment flow in sandbox
4. 🔄 Handle settlement and off-ramp
5. 🔄 Add dispute resolution
6. 🔄 Webhook handlers for payment updates
