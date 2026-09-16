# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Component test suite: CustomerList, NewCustomerForm, AddCreditForm, ReceivePayForm (61 tests)
- Schema verification tests for Drizzle tables, enums, and indexes (22 tests)
- Pure `reconcileLedger` and `validateCustomerData` modules extracted for testability
- Shared CSS modules: `balance-summary`, `ledger-header`, `alert-banner`, `FormSheet`
- Custom hooks relocated to `src/hooks/` (`useWhatsAppShare`, `useClipboardCopy`)
- Structured JSON logging via `src/utils/logger`
- Zod schema validation at server action entry points (`CustomerPayloadSchema`, `CreditPayloadSchema`)
- Health check route at `src/app/api/health/route.ts` (200 when DB reachable, 503 otherwise)
- Local Postgres via `docker-compose.yml` for one-command reproducibility

### Changed
- **Test coverage: 30% → 93.4% lines** (275 tests across 18 files, threshold 70%)
- `ActiveLedgerView.tsx` decomposed from 430 LOC to 158 LOC coordinator
- Single source of truth for business logic: `actions.ts` now imports from `lib/validation.ts` and `db/reconcile.ts`
- Duplicated CSS consolidated into shared modules in `src/styles/` and `src/components/ui/`
- `globals.css` slimmed to global-only rules; multi-component classes moved to `styles/`, single-component classes to their module
- Balance label formatting centralized in `formatBalanceLabel` / `formatBalanceAmount`

### Security
- Server Actions with CSRF protection via Next.js
- Customer validation (name, phone, CNIC format)
- Consensus lock preventing concurrent credit/payment during pending transactions

## [0.1.0] - 2026-09-13

### Added
- Initial project scaffold with Next.js 16 App Router
- TypeScript strict mode with shared type definitions
- Modular CSS design system with CSS variables
- ESLint and Vitest configuration
