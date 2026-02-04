# Code Structure Reference

## Backend File Structure

```
BackEnd/
├── .env (NEW - Contains API key)
├── src/
│   ├── models/
│   │   └── group.js (MODIFIED - Added Finternet fields)
│   │       ├── finternetIntentId
│   │       ├── poolAmount
│   │       ├── paymentStatus
│   │       ├── milestones[]
│   │       └── distributions[]
│   │
│   └── routes/
│       └── groups.js (MODIFIED - Added 5 new routes)
│           ├── POST /groups/:groupId/create-payment-intent
│           ├── POST /groups/:groupId/contribute
│           ├── POST /groups/:groupId/verify-pool
│           ├── POST /groups/:groupId/create-milestone
│           └── POST /groups/:groupId/release-milestone
```

## Frontend File Structure

```
FrontEnd/
├── src/
│   └── components/
│       ├── GroupPaymentFlow.jsx (NEW)
│       │   ├── Step 1: Create Payment Intent
│       │   ├── Step 2: Register Contributions
│       │   ├── Step 3: Share Payment Link
│       │   └── Step 4: Verify Pool Status
│       │
│       └── MilestoneTracker.jsx (NEW)
│           ├── Create Milestones
│           ├── View Milestones
│           ├── Release Milestones
│           └── Distribution History
```

## Documentation Files

```
Project Root/
├── MILESTONE_INTEGRATION_GUIDE.md (NEW)
│   └─ Complete integration walkthrough
│
├── API_QUICK_REFERENCE.md (NEW)
│   └─ API endpoints and examples
│
├── FINTERNET_API_INTEGRATION.md (UPDATED)
│   └─ Finternet API call sequences
│
└── IMPLEMENTATION_SUMMARY.md (NEW)
    └─ This summary document
```

---

## Component Hierarchy

```
App
├── Dashboard
│   ├── MyGroups (shows all user's groups)
│   │   └── GroupCard
│   │       └── [Click] → GroupDetail page
│   │
│   └── GroupDetail Page (/:groupId)
│       ├── GroupPaymentFlow
│       │   ├── Pool Status Card
│       │   ├── Create Intent Section (Admin only)
│       │   ├── Contribution Registration (User)
│       │   ├── Participants List
│       │   ├── Payment Link Display
│       │   └── Verify Pool Button
│       │
│       └── MilestoneTracker
│           ├── Create Milestone Form (Admin only)
│           ├── Milestones List
│           │   ├── Milestone Card
│           │   │   ├── Status Badge
│           │   │   ├── Amount Display
│           │   │   └── Release Button (Admin)
│           │   └── ...
│           │
│           └── Distribution History Table
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  GroupPaymentFlow (4-step form)                         │
│  └─ User fills in amount                                │
│     └─ Calls: POST /groups/:id/contribute               │
│                                                         │
│  MilestoneTracker (milestone management)                │
│  └─ Admin creates milestones                            │
│     └─ Calls: POST /groups/:id/create-milestone         │
│  └─ Admin releases milestones                           │
│     └─ Calls: POST /groups/:id/release-milestone        │
│                                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓ API Calls
┌─────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Express Routes (5 endpoints)                           │
│  ├─ POST /create-payment-intent                         │
│  │   └─ Validates admin                                 │
│  │   └─ Calls Finternet API #1                          │
│  │   └─ Stores: group.finternetIntentId                 │
│  │                                                       │
│  ├─ POST /contribute                                    │
│  │   └─ Registers user contribution                     │
│  │   └─ Returns shared payment URL                      │
│  │                                                       │
│  ├─ POST /verify-pool                                   │
│  │   └─ Checks Finternet intent status                  │
│  │   └─ Updates group.paymentStatus                     │
│  │                                                       │
│  ├─ POST /create-milestone                              │
│  │   └─ Validates admin                                 │
│  │   └─ Calls Finternet API #2 (3 times)                │
│  │   └─ Stores: milestone.finternetMilestoneId          │
│  │                                                       │
│  └─ POST /release-milestone                             │
│      └─ Validates admin                                 │
│      └─ Calls Finternet API #3                          │
│      └─ Calculates: amount per user = total / users    │
│      └─ Creates distribution records                    │
│                                                         │
│  MongoDB Models                                         │
│  ├─ Group (with new fields)                             │
│  ├─ User (unchanged)                                    │
│  └─ Transaction (for history)                           │
│                                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓ Finternet API Calls
┌─────────────────────────────────────────────────────────┐
│                  FINTERNET BLOCKCHAIN                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  API #1: Create Payment Intent                          │
│  POST /payment-intents                                  │
│  → Creates escrow account (6000 USDC)                   │
│  ← Returns: intent_c4721336...                          │
│                                                         │
│  API #2: Create Milestones                              │
│  POST /payment-intents/{id}/escrow/milestones           │
│  → Creates 3 milestones (1800, 2400, 1800)              │
│  ← Returns: milestone_2ec266fc... (3 times)             │
│                                                         │
│  API #3: Complete Milestone                             │
│  POST /payment-intents/{id}/escrow/milestones/{id}/...  │
│  → Releases funds from escrow                           │
│  ← Auto-settlement & distribution                       │
│                                                         │
│  Smart Contracts                                        │
│  ├─ Payment Intent Contract                             │
│  ├─ Milestone Escrow Contract                           │
│  └─ Settlement Contract                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Request/Response Examples

### Example 1: Create Payment Intent

**Frontend → Backend**

```javascript
POST http://localhost:7777/groups/group_123/create-payment-intent
{
  "totalAmount": 6000,
  "numParticipants": 3
}
```

**Backend → Finternet**

```javascript
POST https://api.fmm.finternetlab.io/api/v1/payment-intents
{
  "amount": "6000",
  "currency": "USDC",
  "type": "DELIVERY_VS_PAYMENT",
  "metadata": {
    "releaseType": "MILESTONE_LOCKED"
  }
}
```

**Finternet → Backend**

```javascript
{
  "data": {
    "id": "intent_c4721336-8e51-45a3-a507-9eff916b63a8",
    "paymentUrl": "https://api.fmm.finternetlab.io/payment/..."
  }
}
```

**Backend → Frontend**

```javascript
{
  "success": true,
  "intentId": "intent_c4721336-8e51-45a3-a507-9eff916b63a8",
  "poolUrl": "https://api.fmm.finternetlab.io/payment/..."
}
```

### Example 2: Register Contribution

**Frontend → Backend**

```javascript
POST http://localhost:7777/groups/group_123/contribute
{
  "contributionAmount": 2000
}
```

**Backend Logic**

```javascript
// 1. Find group
// 2. Register user's contribution amount
// 3. Get stored paymentUrl from group.finternetIntentId
// 4. Return to user
```

**Backend → Frontend**

```javascript
{
  "success": true,
  "paymentUrl": "https://api.fmm.finternetlab.io/payment/intent_c4721336...",
  "yourAmount": 2000,
  "totalPoolTarget": 6000,
  "currentContributions": 4000
}
```

### Example 3: Create Milestone

**Frontend → Backend**

```javascript
POST http://localhost:7777/groups/group_123/create-milestone
{
  "milestones": [
    {
      "milestoneIndex": 0,
      "description": "Phase 1",
      "amount": 1800,
      "percentage": 30
    }
  ]
}
```

**Backend → Finternet** (Once per milestone)

```javascript
POST https://api.fmm.finternetlab.io/api/v1/payment-intents/intent_c4721336-8e51-45a3-a507-9eff916b63a8/escrow/milestones
{
  "milestoneIndex": 0,
  "description": "Phase 1",
  "amount": "1800",
  "percentage": 30
}
```

**Finternet → Backend**

```javascript
{
  "data": {
    "id": "milestone_2ec266fc-2775-4b6b-be98-10d61559c208",
    "status": "PENDING"
  }
}
```

**Backend → Frontend**

```javascript
{
  "success": true,
  "milestones": [
    {
      "finternetMilestoneId": "milestone_2ec266fc-2775-4b6b-be98-10d61559c208",
      "index": 0,
      "amount": 1800,
      "status": "PENDING"
    }
  ]
}
```

### Example 4: Release Milestone

**Frontend → Backend**

```javascript
POST http://localhost:7777/groups/group_123/release-milestone
{
  "milestoneId": "milestone_2ec266fc-2775-4b6b-be98-10d61559c208",
  "milestoneIndex": 0
}
```

**Backend → Finternet**

```javascript
POST https://api.fmm.finternetlab.io/api/v1/payment-intents/intent_c4721336-8e51-45a3-a507-9eff916b63a8/escrow/milestones/milestone_2ec266fc-2775-4b6b-be98-10d61559c208/complete
{
  "completedBy": "admin_address",
  "completionProof": "Milestone 0 completed"
}
```

**Finternet → Backend**

```javascript
{
  "object": "milestone",
  "status": "completed"
}
```

**Backend Logic** (After Finternet success)

```javascript
// 1. Update milestone.status = "RELEASED"
// 2. Calculate per-user amount: 1800 ÷ 3 = 600
// 3. Create distribution records:
//    - User A: 600
//    - User B: 600
//    - User C: 600
// 4. Save to group.distributions
```

**Backend → Frontend**

```javascript
{
  "success": true,
  "milestone": {
    "index": 0,
    "totalReleased": 1800,
    "perUserAmount": 600
  },
  "distributions": [
    { "user": "user_A", "amount": 600 },
    { "user": "user_B", "amount": 600 },
    { "user": "user_C", "amount": 600 }
  ]
}
```

---

## State Management

### Frontend (React State)

**GroupPaymentFlow Component**

```javascript
const [group, setGroup] = useState(null); // Group data
const [paymentUrl, setPaymentUrl] = useState(null); // Shared URL
const [poolStatus, setPoolStatus] = useState(null); // Verification
const [contributionAmount, setContributionAmount] = useState("");
```

**MilestoneTracker Component**

```javascript
const [milestones, setMilestones] = useState([]); // Milestone list
const [distributions, setDistributions] = useState([]); // Releases
const [newMilestoneForm, setNewMilestoneForm] = useState({
  description: "",
  amount: "",
  percentage: "",
  index: 0,
});
```

### Backend (MongoDB)

**Group Document**

```javascript
{
  _id: ObjectId,
  name: "Trip Pool",

  // New Finternet fields
  finternetIntentId: "intent_c4721336...",
  poolAmount: 6000,
  paymentStatus: "FUNDED",

  milestones: [ /* array */ ],
  distributions: [ /* array */ ],

  // Existing fields
  participants: [ /* array */ ],
  admin: ObjectId,
  // ...
}
```

---

## Environment Variables

```bash
# .env (Backend)
FINTERNET_API_KEY=sk_hackathon_6363ad2f4fe8db81d46787d9aeafb604
FINTERNET_BASE_URL=https://api.fmm.finternetlab.io/api/v1
FINTERNET_SETTLEMENT_WALLET=0x742d35Cc6634C0532925a3b844Bc9e7595f42318
```

```javascript
// Frontend (vite.config.js or .env.local)
VITE_API_BASE=http://localhost:7777
```

---

## Error Handling Flow

```
Frontend Error
├─ Network error
│  └─ Show: "Network error, try again"
├─ Validation error
│  └─ Show: "Please fill all fields"
└─ Server error (4xx/5xx)
   └─ Show: err.response.data.message

Backend Error
├─ Authorization error
│  └─ Return 403: "Only admin can..."
├─ Not found error
│  └─ Return 404: "Group not found"
├─ Validation error
│  └─ Return 400: "Field required"
└─ Finternet API error
   └─ Return 400: { error: finternetResponse }
   └─ Log: console.error()
```

---

## Security Layer

```
Request Flow:
1. Frontend sends request with Authorization header
   └─ POST /groups/:id/create-milestone
      ├─ userAuth middleware validates token
      ├─ Extracts: req.user._id
      └─ Validates: req.user.admin === true

2. Backend route checks admin status
   └─ if (group.admin.toString() !== req.user._id.toString())
      └─ Return 403: "Only admin can..."

3. Finternet API uses server-side API key
   └─ Never exposed to frontend
   └─ Stored in .env
   └─ Used in fetch headers only

4. Sensitive data filtered
   └─ API key never in responses
   └─ Transaction details sanitized
```

---

## Testing Checklist

```
Frontend Tests:
☐ GroupPaymentFlow renders
☐ Create intent button works
☐ Contribute form submits
☐ Payment URL displays
☐ Verify button fetches status
☐ MilestoneTracker renders
☐ Create milestone form works
☐ Release button shows confirmation
☐ Distribution history displays

Backend Tests:
☐ GET /groups/:id returns data
☐ POST /create-payment-intent creates intent
☐ POST /contribute saves amount
☐ POST /verify-pool checks status
☐ POST /create-milestone calls Finternet 3x
☐ POST /release-milestone calls Finternet 1x
☐ Admin-only endpoints reject non-admins
☐ Distributions calculated correctly

Integration Tests:
☐ Full 3-user payment flow
☐ All 3 milestones release successfully
☐ Final totals: 2000 per user
☐ Database records match Finternet
```

---

## Key Implementation Details

### Single Intent Design

```javascript
// ✅ CORRECT: One intent for all users
const intent = {
  amount: "6000",
  payerType: "MULTIPLE_CONTRIBUTORS",
};

// ❌ WRONG: Separate intents for each user
const intentA = { amount: "2000" };
const intentB = { amount: "2000" };
const intentC = { amount: "2000" };
```

### Distribution Calculation

```javascript
// When milestone 0 (1800) is released:
const releaseAmount = 1800;
const participantCount = 3;
const perUserAmount = releaseAmount / participantCount; // 600

// Create one distribution record per user
distributions.push({
  user: userA._id,
  milestoneIndex: 0,
  amount: 600,
  status: "RELEASED",
});
// ... repeat for B and C
```

### Status Progression

```javascript
// Group progression
"OPEN"
  ↓ (admin creates intent)
"AWAITING_CONTRIBUTIONS"
  ↓ (all users pay)
"FUNDED"
  ↓ (admin creates milestones)
"PROCESSING"
  ↓ (releases happen)
"SUCCEEDED"
  ↓ (final release)
"SETTLED" / "FINAL"

// Milestone progression (per milestone)
"PENDING"
  ↓ (admin releases)
"COMPLETED"
  ↓ (auto-released)
"RELEASED"
```

---

This completes the full milestone payment system implementation! 🎉
