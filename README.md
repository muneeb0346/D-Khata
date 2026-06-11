# 📊 D-Khata: Production Ledger Mobile WebApp

> 🚀 **Live Demo:** [View Deployment](https://d-khata.vercel.app/)

A secure, full-stack digital ledger system engineered for atomic financial tracking and two-party transaction consensus. This application digitizes manual financial tracking with a highly optimized, mobile-first architecture.

## 🧠 Engineering Challenge

The core objective was to build a secure, reliable ledger application capable of handling complex financial data. The system required a robust mechanism to prevent race conditions during concurrent financial updates, maintain strict data integrity, and enforce a two-party verification state machine between merchants and customers.

## ⚙️ Technical Implementation

*   **Architecture & Type Safety:** Architected a type-safe, full-stack ecosystem using the Next.js App Router and TypeScript. Leveraged Next.js Server Actions to securely mutate data directly from the client, eliminating standard API boilerplate and ensuring strict end-to-end type safety.
*   **Data Engineering & Integrity:** Designed complex relational database schemas using PostgreSQL (NeonDB) and Drizzle ORM. Engineered robust atomic database transactions (`db.transaction`) to safely execute dual-entry updates, ensuring customer balances and historical ledgers remain perfectly synchronized without data corruption.
*   **Business Logic & State Machines:** Implemented a strict transactional state machine (Pending, Verified, Disputed). Engineered custom backend logic to automatically lock merchant credit additions while pending customer verifications are active, guaranteeing absolute consensus before altering total debts or advances.
*   **Testing & Performance:** Guaranteed the reliability of critical financial operations by writing comprehensive backend unit tests using Vitest. Maintained a highly optimized frontend rendering path, achieving a 98+ Google Lighthouse Performance score alongside perfect 100s in SEO and Best Practices.

## 🛠️ Tech Stack

*   **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
*   **Backend:** Next.js Server Actions, Node.js
*   **Database:** PostgreSQL (NeonDB), Drizzle ORM
*   **Testing:** Vitest
*   **Deployment:** Vercel

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

3. **Configure Environment Variables:**
Create a `.env.local` file in the root directory and add your database connection string and any required secrets:

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
