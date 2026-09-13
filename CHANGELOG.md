# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of D-Khata two-party consensus ledger
- Customer CRUD (create, read, update, delete) with validation
- Transaction management (credit, payment, resolve) with consensus lock
- Public ledger view for customer verification via WhatsApp links
- Dashboard with customer list, search, and balance filtering
- Balance history chart with Recharts
- Vitest backend unit tests covering core business logic
- Drizzle ORM schema with PostgreSQL (NeonDB)

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
