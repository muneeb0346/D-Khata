# 📊 D-Khata: Two-Party Consensus Ledger for Kiryana Stores

> 🚀 **Live Demo:** [View Deployment](https://d-khata.vercel.app/)

A secure, mobile-first digital ledger system engineered to eliminate end-of-month financial disputes between local merchants and their customers through a strict two-party transaction consensus model.

## 💡 The Problem: The One-Sided Khata

After visiting local Kiryana stores, I discovered a critical flaw in how informal credit (Khata) operates. Physical ledgers are maintained entirely on the merchant's side. At the end of the month, this one-sided record-keeping leads to severe disputes—customers often claim they are being overcharged or challenge transactions they don't remember.

To avoid the headache, merchants end up shutting down their on-credit systems entirely, which costs them honest, loyal customers.

## 🚀 The Solution: D-Khata

D-Khata digitizes the ledger and enforces transparency through a real-time verification loop:

1. **Onboarding:** Merchants register a customer using basic details (Name, Address, CNIC, WhatsApp number).
2. **Digital Logging:** When a customer buys on credit, the merchant logs the transaction on the app.
3. **WhatsApp Delivery:** The customer instantly receives a unique, customer-specific web link via WhatsApp detailing the transaction.
4. **The Consensus Lock:** The customer must explicitly **Verify** or **Reject** the transaction. **The system locks the merchant from adding any new credit or receiving payments for this customer until the pending transaction is resolved.**
5. **Resolution:** If verified, the ledger updates safely. If rejected, the merchant and customer can discuss and correct the atomic transaction immediately—not 30 days later.

## 🧠 Engineering & Technical Implementation

Translating this real-world workflow into a reliable application required solving several technical challenges:

- **Transactional State Machines:** Implemented a strict backend state machine (Pending, Verified, Disputed) to handle the consensus lock. Custom logic ensures total debts or advances are _only_ mutated when the state transitions to 'Verified'.
- **Data Integrity & Concurrency:** Designed complex relational database schemas using PostgreSQL (NeonDB) and Drizzle ORM. Engineered robust atomic database transactions (`db.transaction`) to safely execute dual-entry updates and prevent race conditions if the merchant and customer interact with the ledger simultaneously.
- **Architecture & Type Safety:** Architected a type-safe, full-stack ecosystem using the Next.js App Router and TypeScript. Leveraged Next.js Server Actions to securely mutate data directly from the client, eliminating standard API boilerplate.
- **Testing & Performance:** Guaranteed the reliability of critical financial operations by writing comprehensive backend unit tests using Vitest. Maintained a highly optimized frontend rendering path, achieving a 98+ Google Lighthouse Performance score alongside perfect 100s in SEO and Best Practices.

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Modular CSS
- **Backend:** Next.js Server Actions, Node.js
- **Database:** PostgreSQL (NeonDB), Drizzle ORM
- **Testing:** Vitest
- **Deployment:** Vercel

## 📂 Directory Structure

```text
D-Khata/
├── src/
│   ├── app/                # Next.js App Router (Frontend Pages & Routing)
│   │   ├── khata/          # Customer-specific ledger routes (WhatsApp targets)
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Reusable React components (Modular CSS)
│   │   ├── charts/         # Data visualization components
│   │   ├── dashboard/      # Main dashboard views & interactive forms
│   │   ├── khata/          # Ledger-specific UI components
│   │   └── ui/             # Core UI elements (Buttons, Modals, Spinners)
│   ├── server/             # Backend operations
│   │   ├── db/             # Drizzle ORM setup & Postgres schemas
│   │   ├── actions.ts      # Next.js Server Actions (Business logic & locks)
│   │   └── actions.test.ts # Vitest backend unit tests
│   ├── styles/             # Global CSS & reset configurations
│   ├── types/              # TypeScript interfaces and global types
│   └── utils/              # Helper utilities (e.g., data formatters)
├── drizzle.config.ts       # Database ORM configuration
├── vitest.config.ts        # Unit testing configuration
├── next.config.ts          # Next.js framework configuration
└── package.json            # Project dependencies and scripts

```

## 💻 Local Installation

To run this project locally, follow these steps:

1. **Clone the repository:**

```bash
   git clone https://github.com/muneeb0346/D-Khata.git
   cd D-Khata

```

2. **Install dependencies:**

```bash
   npm install

```

2.1 **(Optional) Start a local database with Docker:**

```bash
   docker compose up -d
```

This starts a Postgres 16 container. Then point your `.env.local` at it:
`DATABASE_URL=postgresql://dkhata:dkhata@localhost:5432/dkhata`

3. **Configure Environment Variables:**
   Copy the example environment file and add your database connection string:

```bash
   cp .env.example .env.local
```

Then edit `.env.local` to set your `DATABASE_URL` (PostgreSQL/NeonDB connection string):

```env
   DATABASE_URL="postgresql://user:password@host/dbname"
```

4. **Push Database Schemas (Drizzle):**

```bash
   npm run db:push

```

5. **Run the development server:**

```bash
   npm run dev

```

6. **Run Unit Tests:**

```bash
   npm run test

```

7. **Run Tests with Coverage:**

```bash
   npm run test:coverage

```

8. **Run Type Check:**

```bash
   npm run typecheck

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Observability

- **Structured logging:** `src/utils/logger.ts` emits one JSON object per log line (`level`, `message`, `data`, `timestamp`).
- **Health check:** `GET /api/health` returns `200 {"status":"ok","db":"connected"}` when the database is reachable, or `503` with a `detail` field otherwise. Run it with `curl http://localhost:3000/api/health`.

## CI

This project includes a GitHub Actions CI pipeline that runs on every push and pull request. The pipeline executes:

- **Lint**: `npm run lint` (ESLint with Next.js config)
- **Type Check**: `npx tsc --noEmit` (strict TypeScript check)
- **Tests**: `npm run test -- --coverage` (Vitest with 70% line coverage threshold)
- **Dependency Audit**: `npm audit --audit-level=high` (fails on high/critical vulnerabilities)

Check the [Actions tab](https://github.com/muneeb0346/D-Khata/actions) for build status.

**Current coverage:** 93.4% lines across 278 tests in 22 spec files.

## Environment Variables

| Variable       | Required | Description                         |
| -------------- | -------- | ----------------------------------- |
| `DATABASE_URL` | Yes      | PostgreSQL/NeonDB connection string |
