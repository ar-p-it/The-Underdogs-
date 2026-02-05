# Project: Cooper (The-Underdogs-)

## What this is
Cooper is a **group expense + shared pool** app.

- Users can **sign up / log in**.
- Create a **group** (trip, roommates, event).
- Add **expenses** and see **balances/settlements**.
- Create a **shared payment pool** (Finternet payment intent) and manage **milestones**.
- When a milestone is completed, you can choose **who consumed** (participants) and **how to split** the deduction (equal / exact / percent / shares).
- The app can generate a **settlement summary** (contributed vs spent per member) and **suggested transfers**.
- A receipt image can be scanned (OCR-style flow) to **auto-fill** expense details and create an expense.

This repo contains:
- `BackEnd/`: Node.js/Express + MongoDB (Mongoose)
- `FrontEnd/`: React + Vite UI

---

## Main features we worked on

### 1) Group ledger (expense splitting)
In the group ledger, users can:
- Add an expense amount + currency.
- Choose a split method:
  - **equal** (split among all participants)
  - **exact** (enter per-user amounts)
  - **percent** (enter per-user percentages)
  - **shares** (enter per-user shares)
- View balances and settlement suggestions.

Entry point UI: `FrontEnd/src/pages/GroupLedger.jsx`

### 2) Receipt scanning → expense creation
From the group ledger you can open **Scan Receipt**, upload an image, and call the backend endpoint to analyze it.
- The UI lets you verify the scanned values (merchant/amount/date/category).
- Then it creates a new expense (currently saved as an **equal split** expense, with OCR metadata attached in `bill`).

UI: `FrontEnd/src/components/ScanReceiptModal.jsx`
Backend endpoint: `POST /groups/:groupId/analyze-receipt`

### 3) Pool management + milestones (amount-based)
The project includes a "payment pool" flow:
- Admin can create a Finternet **payment intent** for the group.
- Users can register contributions.
- A "pool" exists in the DB for that group.

Then **milestones** can be created in the pool:
- Milestones use **releaseAmount** (fixed amount) as the primary mechanism.
- Legacy `releasePercent` is still supported for backward compatibility in places.

UI: `FrontEnd/src/components/PoolManagement.jsx`
API: `POST /pools/:poolId/milestones`

### 4) Milestone completion with "Deduct From" + split methods
When completing a milestone, the app records **who consumed** that milestone amount.
This is done by creating a `PoolExpense` record with per-user allocations.

Supported split modes:
- **equal**: split the milestone amount across selected participants
- **exact**: exact per-user amounts (must sum to milestone amount)
- **percent**: per-user percents (must sum to 100%)
- **shares**: proportional shares (total shares must be > 0)

API: `POST /pools/:poolId/milestones/:milestoneId/complete`
Model: `BackEnd/src/models/poolExpense.js`

### 5) Settlement computation (pool contributed vs spent)
A settlement endpoint calculates:
- contributed per user (from `pool.contributions`)
- spent per user (from `PoolExpense.allocations`)
- net per user = contributed − spent

It returns "suggested transfers" to settle all debts.

API: `GET /pools/:poolId/settlement`
Implementation: `BackEnd/src/routes/pools.js`

Important behavior:
- The settlement includes the union of:
  - group participants
  - pool contributors
  - anyone referenced in pool expense allocations

### 6) Authentication & route protection
Auth is cookie-based JWT:
- Backend sets an **httpOnly** cookie `token` on login.
- Frontend uses `credentials: include` so the cookie is sent.

Protected navigation rules:
- If logged out, you **cannot** access protected pages:
  - `/dashboard`
  - `/my-groups`
  - `/groups/:groupId`
- If logged in, you **cannot** access:
  - `/login`
  - `/signup`

The frontend hydrates auth on app load by calling `GET /profile`.

Frontend implementation: `FrontEnd/src/App.jsx`, `FrontEnd/src/redux/authSlice.js`
Backend middleware: `BackEnd/src/middleware/adminAuth.js`

---

## Tech stack

### Frontend
- React (Vite)
- React Router
- Redux Toolkit (`authSlice`)
- Tailwind + daisyUI
- Axios
- Framer Motion + GSAP

### Backend
- Node.js + Express
- MongoDB via Mongoose
- JWT cookie auth (`cookie-parser`, `jsonwebtoken`)
- CORS configured with credentials
- Multer (file upload) for receipt scanning
- Optional Finternet integration (payment intents)

---

## Repo layout

High level:
- `BackEnd/src/app.js` – Express app entry, routers, CORS
- `BackEnd/src/routes/auth.js` – signup/login/profile/logout
- `BackEnd/src/routes/groups.js` – groups + expenses + receipt scan + payment intent flow
- `BackEnd/src/routes/pools.js` – pool milestones, completion allocations, settlement
- `FrontEnd/src/App.jsx` – routes + auth guards + auth hydration
- `FrontEnd/src/pages/GroupLedger.jsx` – group ledger UI
- `FrontEnd/src/components/PoolManagement.jsx` – milestone + settlement UI
- `FrontEnd/src/components/GroupPaymentFlow.jsx` – create payment intent + open payment URL

---

## How to run (local development)

### Prerequisites
- Node.js (Vite warns unless Node is **20.19+** or **22.12+**)
- npm
- MongoDB connectivity (this repo currently points at a Mongo Atlas URI)

### 1) Backend
From repo root:

```bash
cd BackEnd
npm install
npm run start
```

Backend listens on **port 7777** (hard-coded in `BackEnd/src/app.js`).

### 2) Frontend
In a second terminal:

```bash
cd FrontEnd
npm install
npm run dev
```

Vite runs on **http://localhost:5173** by default.

### 3) Configure API base URL (frontend)
Frontend uses this environment variable:

- `VITE_API_BASE` (defaults to `http://localhost:7777`)

Example `FrontEnd/.env`:

```bash
VITE_API_BASE=http://localhost:7777
```

---

## Environment variables & configuration notes

### Backend env vars
Backend loads env via `dotenv` in `BackEnd/src/app.js`.
Common settings:
- `FINTERNET_API_KEY` – required if you want to call Finternet payment intent APIs
- `FRONTEND_ORIGIN` – allowed CORS origin (defaults to `http://localhost:5173`)

Example `BackEnd/.env`:

```bash
FINTERNET_API_KEY=your_finternet_key_here
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### MongoDB connection
Current implementation uses a **hard-coded Mongo URI** in:
- `BackEnd/src/config/databse.js`

For a real deployment, this should be moved into an env var like `MONGODB_URI`.

---

## How to use the app (end-to-end)

1) Start backend + frontend.
2) Open the UI.
3) Create an account (Sign Up) and log in.
4) Create a group.
5) Open a group ledger:
   - Add expenses and see balances.
   - Use Scan Receipt to create an expense from an image.
6) Go to Payment Pool section:
   - Create a payment intent (admin flow).
   - Share the payment URL with participants.
   - Record contributions.
7) Use Pool Management:
   - Create milestones with a fixed release amount.
   - Complete milestone:
     - choose who consumed (Deduct From)
     - choose split method
   - View Settlement:
     - contributed/spent/net per member
     - suggested transfers

---

## API surface (current routing)

Note: some older docs reference `/api/...`, but the current Express app mounts routes as:

### Auth
- `POST /signup`
- `POST /login`
- `GET /profile` (requires auth cookie)
- `POST /logout`

### Groups
- `POST /groups` (create group)
- `GET /groups/:groupId`
- `POST /groups/:groupId/expenses`
- `GET /groups/:groupId/expenses`
- `GET /groups/:groupId/balances`
- `POST /groups/:groupId/analyze-receipt` (multipart form upload)

Finternet-related:
- `POST /groups/:groupId/create-payment-intent`

### Pools
- `GET /pools/group/:groupId`
- `GET /pools/:poolId/milestones`
- `POST /pools/:poolId/milestones`
- `POST /pools/:poolId/milestones/:milestoneId/complete`
- `GET /pools/:poolId/settlement`
- `POST /pools/:poolId/contribute`

---

## Data model summary

- **Group**: participants, currency, pool parameters, Finternet intent IDs
- **Pool**: total amount, contributions, milestones, released amount
- **Milestone**: title/description, `releaseAmount`, status, completion info
- **PoolExpense**: records milestone deduction allocations per user

---

## Known quirks / things to be aware of

- Backend prints environment variables on startup (debug logging) in `BackEnd/src/app.js`.
- Group creation currently sets `poolAmount = depositAmountPerPerson * 3` (assumes 3 participants by default).
- Vite warns if Node.js is below the required patch version (build may still succeed).
- The MongoDB URI is currently embedded in source; rotate/move to env for security.

---

## Helpful docs already in this repo
- `API_QUICK_REFERENCE.md`
- `CODE_STRUCTURE.md`
- `FINTERNET_API_INTEGRATION.md`
- `IMPLEMENTATION_SUMMARY.md`
- `MILESTONE_INTEGRATION_GUIDE.md`

If you want, I can also update those docs to match the current non-`/api` route paths (so everything is consistent).
