# AGENTS.md (nexora-api)

> Read fully before any task. Claude Code: `cp AGENTS.md CLAUDE.md`.
> This project already has working code. **Match existing patterns; do not rewrite or refactor existing code unless the task says so.**

## Project

Backend of a Multi-Site CMS + Product Review & Affiliate Publishing Platform.
Sibling projects: `../nexora-admin` (Admin Dashboard, Next.js), `../docs` (requirements/design).

## Documents (in `../docs/`)

- `SPEC.md` + `SPEC-addendum.md`: decisions. **Win over other docs on conflict.**
- `TASKS.md`: task list. Pick ONE task per session.
- `01-srs.md` (FR/NFR/BR), `03-hld.md` (architecture), `04-lld.md` (entities, APIs). Read only the sections your task references.
- `AUDIT.md`: what is actually implemented vs the docs (if present, read it).

## Stack (actual)

NestJS + Fastify, TypeScript, PostgreSQL, **Prisma 7** (`prisma7.config.ts`, client generated into `src/database/generated/prisma`), Redis, BullMQ (to be added), Vitest (unit + e2e), oxlint + Prettier, pnpm, Docker Compose.

## Existing structure (follow it)

```
prisma/ (schema.prisma, migrations/, seed/)
src/
  common/ (filters, interceptors, interfaces)   # global response + error format
  config/env.validation.ts
  database/ (prisma.service.ts, generated/)     # NEVER edit generated/
  health/ mail/ redis/ types/
  modules/
    admin/ (auth, dto, email-verification, guards, management)
    audit/
    rbac/ (assignments, decorators, guards, permissions, roles, security)
```

- New feature = new folder `src/modules/<feature>/` with `<feature>.module.ts`, `.controller.ts`, `.service.ts`, `dto/`. Same flat style as `modules/audit`.
- Add new modules to `app.module.ts`.
- Services use `PrismaService` directly (existing pattern). Do NOT introduce a repository layer.

## Commands

Check `package.json` scripts. Typical: `pnpm dev`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
Task T0.9 adds a single `pnpm check` (lint + typecheck + test + build). Once it exists, it **must pass before a task is done**.
After editing `schema.prisma`: create migration, then `prisma generate`. Never edit an existing migration.

## Architecture Rules

1. Controllers: routing + DTO only. Business logic in services.
2. Cross-module use: import the other module's exported service only. Never reach into its internals.
3. **Every site-scoped query filters by `siteId`**, and the service verifies the caller may access that site.
4. Protected endpoints use the existing `admin-auth.guard` + `permission.guard` with `@Permissions(...)` (see `rbac/decorators`). Add new permission codes to `prisma/seed/permissions.ts` and update role seeds.
5. All input via DTO + ValidationPipe (class-validator). Reuse existing response interceptor and exception filter; never hand-build response shapes.
6. Multi-step writes use `prisma.$transaction`. No external calls (email, S3) inside a transaction.
7. Cache invalidation and queue dispatch happen **after** commit.
8. Sensitive admin actions write an audit log through the existing `audit` service.
9. Public endpoints expose only PUBLISHED data for the resolved site.
10. Use `/api/v1` prefix; document endpoints with OpenAPI decorators.

## Security Rules (non-negotiable)

- Never weaken existing auth, session, login-attempt, or super-admin protection logic.
- Store only hashes of session tokens, OTPs, verification tokens. Enforce expiry, attempt limits, no replay.
- Affiliate redirect: resolve stored ACTIVE link by id; never accept a URL from the request.
- Review `overallScore` is always computed server-side.
- Uploads: validate size, extension, MIME and file signature; generated storage key.
- Never log secrets/tokens/passwords. Never trust `siteId` from the body without an access check.

## Testing Rules

- Every task ships tests (Vitest): service unit tests + at least one API/e2e test with happy path and main failure paths.
- Mandatory cases: permission denial, cross-site denial, status transitions, score math, redirect safety, token expiry/replay.
- Never delete, skip or weaken a test to make it pass.

## DO NOT

- Add dependencies, change existing migrations, or touch `.env`, lock files, `generated/` without asking.
- Rename/move existing files or refactor outside the task.
- Change existing API response formats or auth behavior unless the task says so.
- Do work belonging to another task.

## Workflow

1. Read `../docs/SPEC.md`, `SPEC-addendum.md`, your task, then only the referenced FR/LLD sections.
2. Look at 1-2 existing similar modules and copy their pattern.
3. Post a short plan (files, schema changes, new permissions). Wait for approval if schema/dependency changes.
4. Implement in small steps with tests.
5. Run lint + tests + build (`pnpm check` when available). Fix until green.
6. Tick the task in `../docs/TASKS.md`, add notes if you made a decision.
7. Summarize: files changed, what was done, uncertainties.
8. Commit: `feat(sites): ...`, `fix(auth): ...`, `test: ...`, `chore: ...`.
