# API Quick Reference - Milestone Payment Flows

## 🚀 Complete Payment Flow

### 1️⃣ Admin Creates Group & Initializes Pool

```bash
# Create group with pool parameters
POST /api/groups
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Trip Expense Pool",
  "description": "Splitting trip costs for 3 people",
  "depositAmountPerPerson": 2000,
  "currency": "USDC"
}

# Response
{
  "success": true,
  "group": {
    "_id": "group_123",
    "finternetWalletId": "POOL_abc123xyz",
    "poolAmount": 6000,
    "paymentStatus": "AWAITING_CONTRIBUTIONS"
  }
}
```

### 2️⃣ Admin Creates Finternet Payment Intent (Single Pool)

```bash
POST /api/groups/group_123/create-payment-intent
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "totalAmount": 6000,
  "numParticipants": 3
}

# Response
{
  "success": true,
  "intentId": "intent_c4721336-8e51-45a3-a507-9eff916b63a8",
  "poolUrl": "https://api.fmm.finternetlab.io/payment/intent_c4721336...",
  "totalPoolAmount": 6000
}
```

### 3️⃣ Each User Registers Their Contribution

```bash
# User A
POST /api/groups/group_123/contribute
Authorization: Bearer {userA_token}
Content-Type: application/json

{
  "contributionAmount": 2000
}

# Response (ALL users get SAME payment URL)
{
  "success": true,
  "paymentUrl": "https://api.fmm.finternetlab.io/payment/intent_c4721336...",
  "yourAmount": 2000,
  "totalPoolTarget": 6000,
  "currentContributions": 2000
}

# User B (uses SAME poolUrl)
POST /api/groups/group_123/contribute
Authorization: Bearer {userB_token}
{
  "contributionAmount": 2000
}

# User C (uses SAME poolUrl)
POST /api/groups/group_123/contribute
Authorization: Bearer {userC_token}
{
  "contributionAmount": 2000
}
```

### 4️⃣ All Users Pay Via Shared Payment Link

```
https://api.fmm.finternetlab.io/payment/intent_c4721336...
↓
User A pays 2000 ─┐
User B pays 2000 ─┼─→ Single Escrow Account (6000 total)
User C pays 2000 ─┘
```

### 5️⃣ Verify Pool is Fully Funded

```bash
POST /api/groups/group_123/verify-pool
Authorization: Bearer {any_token}
Content-Type: application/json

{}

# Response
{
  "success": true,
  "message": "✅ Pool fully funded!",
  "totalAmount": 6000,
  "status": "FUNDED",
  "intentStatus": "SUCCEEDED"
}
```

### 6️⃣ Admin Creates Milestones

```bash
POST /api/groups/group_123/create-milestone
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "milestones": [
    {
      "milestoneIndex": 0,
      "description": "Phase 1 - Planning",
      "amount": 1800,
      "percentage": 30
    },
    {
      "milestoneIndex": 1,
      "description": "Phase 2 - Execution",
      "amount": 2400,
      "percentage": 40
    },
    {
      "milestoneIndex": 2,
      "description": "Phase 3 - Delivery",
      "amount": 1800,
      "percentage": 30
    }
  ]
}

# Response
{
  "success": true,
  "milestones": [
    {
      "finternetMilestoneId": "milestone_2ec266fc-2775-4b6b-be98-10d61559c208",
      "index": 0,
      "description": "Phase 1 - Planning",
      "amount": 1800,
      "status": "PENDING"
    },
    ...
  ]
}
```

### 7️⃣ Release Milestones (Unlock Funds)

```bash
# Release Milestone 0 (1800 USDC) → 600 per user
POST /api/groups/group_123/release-milestone
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "milestoneId": "milestone_2ec266fc-2775-4b6b-be98-10d61559c208",
  "milestoneIndex": 0
}

# Response
{
  "success": true,
  "message": "Released 1800 from milestone 0",
  "milestone": {
    "index": 0,
    "totalReleased": 1800,
    "perUserAmount": 600,
    "releasedAt": "2026-02-05T10:30:00Z"
  },
  "distributions": [
    {
      "user": "user_A_id",
      "milestoneIndex": 0,
      "amount": 600,
      "status": "RELEASED"
    },
    {
      "user": "user_B_id",
      "milestoneIndex": 0,
      "amount": 600,
      "status": "RELEASED"
    },
    {
      "user": "user_C_id",
      "milestoneIndex": 0,
      "amount": 600,
      "status": "RELEASED"
    }
  ]
}

# Release Milestone 1 (2400 USDC) → 800 per user
POST /api/groups/group_123/release-milestone
{
  "milestoneId": "milestone_xyz789",
  "milestoneIndex": 1
}
# Each user gets 800

# Release Milestone 2 (1800 USDC) → 600 per user
POST /api/groups/group_123/release-milestone
{
  "milestoneId": "milestone_abc456",
  "milestoneIndex": 2
}
# Each user gets 600

# Total per user: 600 + 800 + 600 = 2000 ✅
```

---

## 📊 Distribution Example

**Pool: 6000 USDC (3 users × 2000 each)**

### Milestones Configuration

| #         | Phase     | Amount    | %        | Per User  |
| --------- | --------- | --------- | -------- | --------- |
| 0         | Planning  | 1,800     | 30%      | 600       |
| 1         | Execution | 2,400     | 40%      | 800       |
| 2         | Delivery  | 1,800     | 30%      | 600       |
| **Total** |           | **6,000** | **100%** | **2,000** |

### User A's Distribution Timeline

```
Day 1:  Contributes 2000 → Status: PENDING
Day 14: Milestone 0 released → Receives 600 → Balance: 600
Day 21: Milestone 1 released → Receives 800 → Balance: 1400
Day 28: Milestone 2 released → Receives 600 → Balance: 2000 ✅
```

---

## 🔑 Key Endpoints Summary

### Group Management

```
POST   /api/groups                          → Create group
GET    /api/groups/my                       → Get user's groups
POST   /api/groups/join                     → Join group by ID
```

### Payment Intent & Contributions

```
POST   /api/groups/:groupId/create-payment-intent   → Create shared pool intent
POST   /api/groups/:groupId/contribute              → Register contribution
POST   /api/groups/:groupId/verify-pool             → Check pool funding status
```

### Milestones

```
POST   /api/groups/:groupId/create-milestone        → Create milestone breakdown
POST   /api/groups/:groupId/release-milestone       → Release funds from milestone
```

---

## ⚠️ Important Rules

### ✅ DO:

- ✅ Create ONE payment intent per group (not one per user)
- ✅ Have all users contribute to the SAME payment URL
- ✅ Release milestones sequentially (0 → 1 → 2)
- ✅ Distribute equally to all participants
- ✅ Store milestone IDs from Finternet response

### ❌ DON'T:

- ❌ Create separate intents for each user
- ❌ Release out-of-order milestones
- ❌ Manually override distribution amounts
- ❌ Expose API key in frontend code

---

## 🧪 Quick Test Commands

### Using cURL

```bash
# 1. Create Group
curl -X POST http://localhost:7777/groups \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Pool",
    "depositAmountPerPerson": 2000,
    "currency": "USDC"
  }'

# 2. Create Payment Intent
curl -X POST http://localhost:7777/groups/group_id/create-payment-intent \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 6000,
    "numParticipants": 3
  }'

# 3. Contribute
curl -X POST http://localhost:7777/groups/group_id/contribute \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "contributionAmount": 2000
  }'

# 4. Verify Pool
curl -X POST http://localhost:7777/groups/group_id/verify-pool \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'

# 5. Create Milestones
curl -X POST http://localhost:7777/groups/group_id/create-milestone \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "milestones": [
      {"milestoneIndex": 0, "amount": 1800, "percentage": 30}
    ]
  }'

# 6. Release Milestone
curl -X POST http://localhost:7777/groups/group_id/release-milestone \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "milestoneId": "milestone_id",
    "milestoneIndex": 0
  }'
```

---

## 📱 Frontend Integration

### Component Usage

```jsx
import GroupPaymentFlow from "./components/GroupPaymentFlow";
import MilestoneTracker from "./components/MilestoneTracker";

// In your page/dashboard
export default function GroupPage({ groupId }) {
  return (
    <div>
      <GroupPaymentFlow groupId={groupId} />
      <MilestoneTracker groupId={groupId} />
    </div>
  );
}
```

---

## 💾 Database Schema Reference

### Group Collection

```javascript
{
  finternetIntentId: String,      // Shared payment intent ID
  poolAmount: Number,              // Total pool target (6000)
  paymentStatus: String,           // AWAITING_CONTRIBUTIONS, FUNDED, etc.

  milestones: [{
    finternetMilestoneId: String,
    index: Number,
    description: String,
    amount: Number,
    status: String,                // PENDING, COMPLETED, RELEASED
    releasedAt: Date,
    releasedAmount: Number
  }],

  distributions: [{
    user: ObjectId,
    milestoneIndex: Number,
    amount: Number,
    status: String,                // RELEASED
    releasedAt: Date
  }]
}
```

---

## 🎯 Common Patterns

### 30/40/30 Split

```javascript
[
  { index: 0, amount: 1800, percentage: 30 },
  { index: 1, amount: 2400, percentage: 40 },
  { index: 2, amount: 1800, percentage: 30 },
];
```

### 25/25/25/25 (4-phase)

```javascript
[
  { index: 0, amount: 1500, percentage: 25 },
  { index: 1, amount: 1500, percentage: 25 },
  { index: 2, amount: 1500, percentage: 25 },
  { index: 3, amount: 1500, percentage: 25 },
];
```

### 50/50 (2-phase)

```javascript
[
  { index: 0, amount: 3000, percentage: 50 },
  { index: 1, amount: 3000, percentage: 50 },
];
```

---

## Error Handling

### Common Errors

```javascript
// Group not found
{
  "success": false,
  "message": "Group not found"
}

// Only admin can perform this
{
  "success": false,
  "message": "Only group admin can create payment intent"
}

// Payment intent not created yet
{
  "success": false,
  "message": "Payment intent not created yet. Admin must create it first."
}

// Finternet API error
{
  "success": false,
  "message": "Failed to create payment intent",
  "error": {
    "code": "invalid_request",
    "message": "..."
  }
}
```
