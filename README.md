<h1 align="center">
  💰 UnitySplit
</h1>

<p align="center">
  <b>Smart expense splitting — powered by the Min Cash Flow algorithm</b><br/>
  A MERN-stack REST API for groups, IOUs, and debt minimization
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express%205-green?logo=node.js" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb" />
  <img src="https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens" />
  <img src="https://img.shields.io/badge/security-Helmet%20%2B%20Rate%20Limiting-blue" />
</p>

---

## ✨ Features

- **Auth** — Register, login, JWT-protected sessions, profile updates, password change
- **Groups** — Create groups with emoji, currency & invite codes; join via code; soft-delete
- **Smart Expense Splitting** — Three split modes:
  - `EQUAL` — divide amount equally among participants
  - `EXACT` — specify custom amounts per person (must sum to total)
  - `PERCENTAGE` — specify % per person (must sum to 100)
- **Debt Minimization** — Min Cash Flow algorithm computes the fewest transactions to settle all debts
- **Real-World Settlements** — Mark and track when debts are paid in real life
- **Personal IOUs** — Peer-to-peer debt tracking with approve / reject / delete
- **Security** — Helmet headers, request rate limiting, body size limits, centralized error handling
- **Logging** — Morgan HTTP request logs
- **Validation** — express-validator on every route with structured 422 error responses

---

## 🗂️ Project Structure

```
UnitySplit/
├── backend/                  # Express API
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── groupController.js
│   │   ├── transactionController.js
│   │   └── settlementController.js
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verify
│   │   ├── errorHandler.js   # AppError + centralized handler
│   │   └── validate.js       # express-validator runner
│   ├── models/
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── Transaction.js
│   │   └── Settlement.js     # Real-world payment records
│   ├── routes/
│   │   ├── auth.js
│   │   ├── groups.js
│   │   ├── transactions.js
│   │   └── settlements.js
│   ├── validators/
│   │   ├── authValidators.js
│   │   ├── groupValidators.js
│   │   └── transactionValidators.js
│   ├── utils/
│   │   └── solver.js         # Min Cash Flow algorithm
│   ├── test/
│   │   └── smoke.js          # 23-assertion end-to-end smoke test
│   ├── .env                  # (not committed)
│   ├── server.js
│   └── package.json
└── frontend/                 # React + Vite client
```

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone the repo
```bash
git clone https://github.com/abhirajk970/UnitySplit.git
cd UnitySplit/backend
```

### 2. Configure environment
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/unitysplit
JWT_SECRET=your_super_secret_key
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Install dependencies & run
```bash
npm install
npm run dev      # Development (nodemon)
npm start        # Production
```

---

## 📡 API Reference

### Auth — `/api/auth`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/register` | ❌ | Register new user |
| `POST` | `/login` | ❌ | Login, returns JWT |
| `GET` | `/me` | ✅ | Get current user profile |
| `PUT` | `/me` | ✅ | Update name, avatar, currency preference |
| `PUT` | `/change-password` | ✅ | Change password |
| `GET` | `/users?search=` | ✅ | Search users by name/email |

### Groups — `/api/groups`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/` | ✅ | Create a group |
| `GET` | `/?page=&limit=` | ✅ | List my groups (paginated) |
| `GET` | `/:id` | ✅ | Get group + all expenses |
| `DELETE` | `/:id` | ✅ | Archive group (creator only) |
| `POST` | `/join` | ✅ | Join group via invite code |
| `POST` | `/:id/expenses` | ✅ | Add expense |
| `PUT` | `/:id/expenses/:eId` | ✅ | Edit expense (payer only) |
| `DELETE` | `/:id/expenses/:eId` | ✅ | Delete expense |
| `GET` | `/:id/settle` | ✅ | Get Min Cash Flow settlement plan |

### Transactions (IOUs) — `/api/transactions`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/` | ✅ | Create personal IOU |
| `GET` | `/?status=&page=` | ✅ | Get my IOUs (filtered, paginated) |
| `PUT` | `/:id/approve` | ✅ | Approve IOU (recipient) |
| `PUT` | `/:id/reject` | ✅ | Reject IOU (recipient) |
| `DELETE` | `/:id` | ✅ | Delete PENDING IOU (creator) |

### Settlements — `/api/settlements`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/` | ✅ | Record a real-world payment |
| `GET` | `/group/:groupId` | ✅ | Get all settlements for a group |

---

## 🔀 Split Types

When adding a group expense, specify `splitType`:

```jsonc
// EQUAL — split evenly (default)
{ "splitType": "EQUAL", "participants": ["userId1", "userId2"] }

// EXACT — custom amounts (must sum to `amount`)
{ "splitType": "EXACT", "splits": [
    { "userId": "uid1", "amount": 400 },
    { "userId": "uid2", "amount": 200 }
]}

// PERCENTAGE — percentage shares (must sum to 100)
{ "splitType": "PERCENTAGE", "splits": [
    { "userId": "uid1", "percentage": 70 },
    { "userId": "uid2", "percentage": 30 }
]}
```

---

## 🧮 Min Cash Flow Algorithm

The settlement solver (`utils/solver.js`) computes the **minimum number of transactions** needed to settle all debts within a group:

1. Compute each member's **net balance** (total paid − total owed)
2. Split into **debtors** (negative balance) and **creditors** (positive balance)
3. Greedily match debtors to creditors — settling the largest amounts first

This reduces N² payment chains to at most N−1 transactions.

---

## 🧪 Smoke Test

Run the included end-to-end test (requires server running):
```bash
# Terminal 1
NODE_ENV=test node server.js

# Terminal 2
npm run test:smoke
```

Covers 23 scenarios across auth, groups, expenses, settlements, and IOUs.

---

## 🔒 Security

| Feature | Implementation |
|---|---|
| Security headers | `helmet` |
| Auth brute-force protection | Rate limit: 10 req / 15 min on `/api/auth` |
| Global rate limit | 100 req / 15 min |
| Body size limit | 10 KB |
| Password hashing | `bcryptjs` (salt rounds: 10) |
| Token auth | `jsonwebtoken` (30-day expiry) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Database | MongoDB + Mongoose 9 |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Security | Helmet, express-rate-limit |
| Logging | Morgan |
| Frontend | React 18 + Vite |

---

## 📄 License

ISC
