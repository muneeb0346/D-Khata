# Contributing

Thank you for your interest in contributing to D-Khata! This document provides guidelines and instructions for contributing.

## Development Setup

1. Fork and clone the repository
2. Run `npm install` to install dependencies
3. Copy `cp .env.example .env.local` and configure `DATABASE_URL`
4. Run `npm run db:push` to set up the database
5. Run `npm run dev` to start the development server

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — A new feature
- `fix:` — A bug fix
- `test:` — Adding or updating tests
- `docs:` — Documentation changes
- `refactor:` — Code refactoring without changing behavior
- `ci:` — CI/CD configuration changes
- `chore:` — Maintenance tasks

## Testing

- Write tests for all new features and bug fixes
- Run `npm run test` before committing — only commit when tests pass
- Run `npm run test:coverage` to check coverage thresholds (70% lines)
- Frontend components should have corresponding `.test.tsx` files using Vitest + React Testing Library
- Server actions should have corresponding test coverage in `actions.test.ts` or dedicated test files

## Code Style

- TypeScript strict mode is enforced — no `any` types
- Use discriminated union types (`{ ok: true, data } | { ok: false, error }`) for Server Action returns
- Use modular CSS (`.module.css`) for component styles
- Use the shared `@/` path alias for imports

## Pull Request Process

1. Ensure code passes `npm run lint`, `npx tsc --noEmit`, and `npm run test`
2. Include tests for any new functionality
3. Update documentation if API or behavior changes
4. The CI pipeline will run automatically and must pass before merging

## Reporting Issues

Open a GitHub issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (browser, OS, Node version)
