# NR Broker AI Agent Instructions

## Project Overview

NR Broker is a deployment business intelligence tool that automates access to HashiCorp Vault secrets, audits deployment activity, and enables access automation. Backend is NestJS (`api/`), frontend is Angular (`ui/`), persistence is MongoDB via MikroORM with a Redis cache/composition layer, and relationships are modeled as a graph (vertices + edges).

**Core concept**: Teams interact with Broker through **intentions** — validated requests containing **actions** (build, install, provision, etc.). Actions are validated against business rules before execution; all activity is audited.

**Stack snapshot** (verify in `api/package.json` / `ui/package.json` before relying on versions): NestJS 11, Angular SPA, MikroORM 7 (`@mikro-orm/decorators/legacy` + `MongoEntityRepository`), class-validator/class-transformer, Vitest (unit + e2e), Redis (cache + pub/sub), HashiCorp Vault, AWS Kinesis/OpenSearch, Podman for local dev.

**Where to start by task**:
- Change the open/start/end/close flow or TTL → `api/src/intention/intention.service.ts`
- Add/modify a business rule → `api/src/intention/validation/` (see [Validation Architecture](#validation-architecture))
- Add an action type → [Adding Action Types](#adding-new-action-types)
- Persist/query data → `api/src/persistence/` (see [Repository Pattern](#repository-pattern))
- Find a symbol across the codebase → prefer the language server (rename / usages) over grep for renames

---

## Quick Reference

| Task | Section | Key Files |
|------|---------|-----------|
| Core workflow | [Intention Workflow](#intention-workflow) | `api/src/intention/intention.service.ts` |
| Add validation rules | [Validation Architecture](#validation-architecture) | `api/src/intention/validation/` |
| MongoDB access | [Repository Pattern](#repository-pattern) | `api/src/persistence/` |
| Redis cache / composition | [Repository Pattern](#repository-pattern) | `api/src/persistence/persistence-cache.interceptor.ts`, `api/src/persistence/redis-composition/` |
| Cross-cutting guards/decos | [Cross-Cutting Concerns](#cross-cutting-concerns) | `api/src/*.decorator.ts`, `api/src/access-logs.middleware.ts` |
| Add action types | [Adding Action Types](#adding-new-action-types) | `api/src/intention/dto/`, `api/src/intention/entity/` |
| Shared helpers | [Module Organization](#module-organization) | `api/src/util/` |
| Common issues | [Common Pitfalls](#common-pitfalls) | — |
| User-facing text | [Communication Style](#communication-style-bc-gov) | — |

## Architecture

### Intention Workflow

An intention is a validated request containing actions. Lifecycle:
1. **Open** — client sends actions; Broker validates against business rules; returns tokens if valid.
2. **Start action** — optional; records `started` state.
3. **Execute work** — client performs the actual work (deploy, provision secrets, etc.).
4. **End action** — optional; records `ended` state.
5. **Close** — finalizes the intention; auto-ends any started actions.

`quickstart=true` on open auto-starts a single action (skips the start/end calls). See `api/src/intention/intention.service.ts` and `docs/dev_intention_lifecycle.md`.

### Repository Layout
- **Backend**: NestJS in `api/src/`, organized into domain modules (see [Module Organization](#module-organization)).
- **Frontend**: Angular SPA in `ui/`, separate `package.json`, built independently.
- **DTOs**: duplicated between backend (`api/src/*/dto/`) and frontend (`ui/src/app/service/*/dto/`); keep in sync via `scripts/copy-dto.sh`.

### Graph Data Model
Relationships are vertices and edges:
- **VertexEntity** (`api/src/persistence/entity/vertex.entity.ts`): a collection node (project, service, environment, ...).
- **EdgeEntity** (`api/src/persistence/entity/edge.entity.ts`): named relationships between vertices (e.g., a "component" edge links project->service).
- **GraphRepository** (`api/src/persistence/interfaces/graph.repository.ts`, impl `api/src/persistence/mongo/graph-mongo.repository.ts` and Redis-backed `api/src/persistence/redis-composition/graph-redis.repository.ts`): queries via `$graphLookup` aggregations with bounded depth.
- Environment hierarchy uses `position`: 0=production, 10=test, 20=development, 30=tools.

### Entity vs Embeddable (MikroORM)
- **`@Entity()`**: top-level collections with `_id` (ObjectId) PK, stored as separate documents (e.g. `IntentionEntity`, `BrokerAccountEntity`, `ServiceEntity`, `PackageBuildEntity`).
- **`@Embeddable()`**: nested objects, no separate document (e.g. `ActionEmbeddable`, `TransactionEmbeddable`, `VaultConfigEmbeddable`).
- Actions are polymorphic via a discriminator: 9 action types extend `ActionEmbeddable` (see [Action Discriminator](#action-discriminator)).
- Decorators come from `@mikro-orm/decorators/legacy`; repositories inject `EntityManager` and/or `@InjectRepository(...)`.

### Module Organization
`api/src/` is organized into domain modules. Each module has a `<domain>.module.ts`, `<domain>.service.ts`, and (where exposed) a `<domain>.controller.ts`, with `dto/` and `entity/` subfolders. Cross-module helpers live in `util/`.
```
api/src/
├── intention/  # Core workflow engine (open, start, end, close) + validation rules
├── collection/  # CRUD + sync for graph collections (project, service, user, account)
├── graph/  # Graph sync + connection/link/typeahead resolution
├── persistence/  # Repository interfaces + Mongo/Redis implementations + cache layer
├── util/  # Cross-module helpers (ActionUtil, DateUtil, UserUtil, ValidatorUtil, JobQueueUtil, ParseObjectIdPipe)
├── auth/  # JWT/OIDC authentication + guards (broker-jwt, broker-oidc, combined)
├── vault/  # HashiCorp Vault integration
├── audit/  # Activity logging + Kinesis streaming
├── provision/  # Vault secret provisioning API (guard + vault-role guard)
├── token/  # Broker token generation
├── communication/  # Email/queue notifications; templates loaded from scripts/db/templates
├── aws/  # Kinesis / OpenSearch
├── github/  # GitHub sync
├── kubernetes/  # Kubernetes/OpenShift secret sync
├── package/  # Package build handling
├── preference/  # User preferences
├── redis/  # Redis client + pub/sub
├── system/  # System config + communication templates (getCommunicationTemplate)
└── health/  # Health checks
```

**Cross-cutting decorators/guards** (top level of `api/src/`, not in a module): `roles.decorator.ts` (`@Roles`), `account-permission.decorator.ts` (`@AccountPermission`), `allow-owner.decorator.ts` (`@AllowOwner`), `allow-body-value.decorator.ts`, `allow-empty-edges.decorator.ts`, and `access-logs.middleware.ts` (HTTP access audit via `AuditService`).

### Cross-Cutting Concerns

Guards and decorators applied across controllers live at the top level of `api/src/` rather than inside a domain module:
- **`roles.decorator.ts`** (`@Roles`) and **`account-permission.decorator.ts`** (`@AccountPermission`): access control on routes; pair with a broker auth guard (`BrokerCombinedAuthGuard` / `BrokerOidcAuthGuard` / `BrokerJwtAuthGuard`).
- **`allow-owner.decorator.ts`** (`@AllowOwner`), **`allow-body-value.decorator.ts`**, **`allow-empty-edges.decorator.ts`**: route-specific permission/shape overrides.
- **`access-logs.middleware.ts`**: global HTTP access audit, delegating to `AuditService.recordHttpAccess`.
- Auth guards live in `api/src/auth/` (`broker-combined-auth.guard.ts`, `broker-oidc-auth.guard.ts`, `broker-jwt-auth.guard.ts`).

## Key Conventions

### Validation Architecture

Rule-based, DMN/Drools-compatible: business rules are individual testable classes that evaluate a shared decision context. Two phases run in priority order, short-circuiting on first failure.

**Phase 1 — Intention-level** (`api/src/intention/validation/intention-rules/`, 2 rules): validates the intention before any action. Context is `IntentionDecisionContext` (`brokerJwt`, `registryJwt`, `account`). Rules: `JwtBlockedValidationRule` (priority 10), `AccountBindingValidationRule` (priority 20). Orchestrated by `IntentionValidationRuleEngine`, which throws `IntentionValidationException` on failure.

**Phase 2 — Action-level** (`api/src/intention/validation/rules/`, 9 rules): validates each action. Context is `DecisionContext` (`intention`, `action`, `account`, `accountBoundProjects`, `user`, `targetServices`, `requireProjectExists`, `requireServiceExists`). Rules by priority: `UserSetValidationRule` (10), `VaultEnvValidationRule` (20), `AccountBoundProjectValidationRule` (30), `TargetServiceValidationRule` (40), `DatabaseAccessValidationRule` (50), `PackageBuildValidationRule` (60), `EnvironmentPromotionValidationRule` (65), `PackageInstallationValidationRule` (70), `AssistedDeliveryValidationRule` (80). Orchestrated by `ValidationRuleEngine`, which returns an `ActionRuleViolationEmbeddable` on failure.

Rules implement `getRuleName()`, `evaluate(context)`, and optional `getPriority()` (default 100). Extend `BaseValidationRule` / `BaseIntentionValidationRule`, which provide `pass()` and `fail(message, key[, data])` helpers. `ActionService` builds the `DecisionContext` and runs the engine per action.

**Adding a rule**: create the class in the appropriate `rules/` or `intention-rules/` dir, export it from that dir's `index.ts`, add it to `intention.module.ts` providers, and inject it into the matching engine constructor. See `docs/dev_validation_rules.md` for the Drools migration mapping (`DecisionContext`->Working Memory, `ValidationRule`->DRL, priority->salience).

### Repository Pattern

Three-layer abstraction in `api/src/persistence/`:
1. **Interface** (`interfaces/*.repository.ts`): abstract class defining the contract (e.g. `IntentionRepository`, `GraphRepository`, `SystemRepository`).
2. **MongoDB implementation** (`mongo/*-mongo.repository.ts`): MikroORM queries via `EntityManager` / `@InjectRepository(...)` (`MongoEntityRepository`); `mongo.util.ts` holds shared query helpers.
3. **Module export** (`persistence.module.ts`): dependency injection.

Services depend on the interface, not the Mongo implementation.

**Redis cache / composition layer** (`api/src/persistence/`): repository methods can be cached in Redis via a NestJS interceptor (`persistence-cache.interceptor.ts`) driven by `@PersistenceCacheKey` / `@PersistenceCacheTtl` / `@PersistenceCacheSuffix` decorators (metadata in `persistence.constants.ts`), with `persistence-redis-util.service.ts` for cache-key/invalidation logic and `persistence-util.service.ts` for shared helpers. `redis-composition/graph-redis.repository.ts` composes a Redis-backed graph view on top of the Mongo `GraphRepository`. When a query result is cached, invalidate on writes.

### Action Discriminator

Actions are polymorphic via a `class-transformer` discriminator on the `action` property. `IntentionDto.actions` maps 9 subtypes (`backup`, `database-access`, `server-access`, `package-build`, `package-configure`, `package-installation`, `package-provision`, `process-end`, `process-start`) to their DTOs. Backend entities mirror this with `ActionEmbeddable` subclasses; validate with `instanceof` checks.

### Environment Variables & Secrets
- **Local Development**: `scripts/setenv-common.sh` (gitignored, copy from `.tmp` template)
- **Secret Management**: `env.hcl` for envconsul (Vault integration)
- **Required Vars**: `BROKER_URL`, `MONGODB_URL`, `OIDC_*`, `VAULT_*`, `AWS_*` (for Kinesis/OpenSearch)
- Constants defined in `api/src/constants.ts`

### Backend Development
```bash
# Install dependencies
npm ci

# Start databases (Podman)
podman run -p 27017:27017 --name broker-mongo -e MONGO_INITDB_ROOT_USERNAME=mongoadmin -e MONGO_INITDB_ROOT_PASSWORD=secret -d mongo:8 --wiredTigerCacheSizeGB 0.25
podman run -p 6379:6379 -p 8001:8001 --name broker-redis -d redis/redis-stack
podman run -p 8200:8200 --cap-add=IPC_LOCK -e VAULT_DEV_ROOT_TOKEN_ID=myroot -d --name broker-vault hashicorp/vault

# Bootstrap databases
./scripts/mongo-setup.sh
./scripts/vault-setup.sh

# Watch mode (sources setenv-backend-dev.sh automatically)
npm run watch
```

### Frontend Development
```bash
cd ui
npm ci

# Watch mode (rebuilds on change, outputs to ../dist-ui/local)
npm run watch

# Production build
npm run build
```

UI served by backend via `ServeStaticModule` from `process.env.NESTJS_UI_ROOT_PATH`.

### Testing
```bash
# Backend unit tests (Vitest)
npm test            # vitest run
npm run test:cov    # vitest run --coverage
npm run test:watch  # vitest (watch mode)

# Backend e2e tests (Vitest, separate config in api/test/vitest-e2e.config.ts)
npm run test:e2e
npm run test:e2e:watch

# Frontend tests (Vitest, run from ui/)
cd ui && npm test
npm run test:watch     # ng test --watch
npm run test:cov       # ng test --coverage
```

Unit/e2e specs live beside their source as `*.spec.ts`; e2e specs in `api/test/`. Use `vi.fn()` / `Mock` for mocks (not Jest's `jest.fn()`).

### Verify Before Finishing (AI workflow)
After editing code, run the fast, high-signal, no-full-build loop for the project you touched.

**Backend** (`api/`):
```bash
npm run typecheck:src  # tsc --noEmit over src (excludes specs/config)
npm run lint:fix        # auto-fix stylistic issues (@stylistic plugin is fixable)
npm run check           # lint + typecheck gate (full src, not just build output)
```
`typecheck` checks all files (including specs) with `tsc --noEmit`; use `typecheck:src` for a faster, spec-free pass during iteration.

**Frontend** (`ui/`): standalone `tsc` does not type-check Angular templates/components, so use the AOT build as the type gate:
```bash
npm run lint:fix   # ng lint --fix (@stylistic plugin is fixable)
npm run build      # ng build runs AOT/ngc type-checking (the real type gate)
```

### Database Migrations
No formal migrations - MongoDB schema-less. Entities evolve in-place:
1. Update entity class (`api/src/persistence/entity/*.entity.ts`)
2. Update DTO (`api/src/persistence/dto/*.dto.ts` + `ui/src/app/service/persistence/dto/*.dto.ts`)
3. MikroORM handles new fields automatically (nullable for optional fields)
4. Production data backfilled via admin scripts or background jobs

### Adding New Action Types
1. Create DTO: `api/src/intention/dto/xxx-action.dto.ts` (validation decorators)
2. Create Embeddable: `api/src/intention/entity/xxx-action.embeddable.ts`
3. Add discriminator entry to `IntentionDto.actions` array
4. Create validation rule(s) in `api/src/intention/validation/rules/` if needed
5. Register validation rules in `intention.module.ts` and inject into `ValidationRuleEngine`
6. Mirror DTO in `ui/src/app/service/intention/dto/`
7. Update API docs: `docs/dev_intention_actions.md`

## Common Pitfalls

1. **DTO Sync**: Backend/frontend DTOs must match exactly - scripts/copy-dto.sh helps automate copying from backend to frontend
2. **ObjectId Conversions**: MongoDB ObjectIds need `.toString()` for responses, `new ObjectId()` for queries
3. **Async Validation**: Action validation is async (DB lookups) - must `await` all validators
4. **Intention TTL**: Default 10min (`INTENTION_DEFAULT_TTL_SECONDS=600`); min 30s, max 30min (`INTENTION_MAX_TTL_SECONDS=1800`). Adjust for long-running actions with `?ttl=1800`
5. **MikroORM Context**: Use `@CreateRequestContext()` decorator for cron jobs / scheduled tasks to ensure proper EntityManager scope
6. **Graph Lookups**: Use `GraphRepository` methods instead of raw aggregations - handles depth limits and circular references
7. **Cache invalidation**: When a repository result is cached in Redis (`@PersistenceCacheKey` / `@PersistenceCacheTtl` / `@PersistenceCacheSuffix`), invalidate the cache on writes; shared cache keys live in `persistence.constants.ts`
8. **Collection config vs sync-queue config**: `GET /v1/collection/config` and `/v1/collection/config/entities` return only collection configs; sync queue configs are served separately by `/v1/collection/config/sync-queue`. Do not expect sync-queue entries from the general config endpoints
9. **Sync API query params**: sync endpoints require a `queue` query param and accept optional `dryRun`; `syncQueueConfig` no longer carries a `queryOption` field
10. **Sync queue type matching**: type>queue resolution must be collection-scoped for shared types like `secrets`/`users`; a global type>queue lookup is ambiguous when multiple queues share the same type

## Communication Style (BC Gov)

All user-facing messages (emails, error messages, validation failures) follow BC Gov Style Guide:
- **Sentence case**: "Token expires in 7 days" not "Token Expires In 7 Days". The names of collections and entities are exceptions and use title case.
- **No emojis**: use plain text.
- **Front-load key info**: put the most important details first.
- **Plain language**: avoid jargon, use everyday words.
- **Actionable**: tell users exactly how to fix issues.

Example:
```typescript
// Bad (violates style guide: emoji, title case, jargon)
return new ActionRuleViolationEmbeddable(
   'ERROR: Pre-Deployment Validation Failed - Build Artifact Missing in Staging Environment',
   'package.version',
);

// Good (sentence case, plain language, actionable)
return new ActionRuleViolationEmbeddable(
   'Build must be deployed to the test environment before deploying to production. Deploy to test first, then retry this installation.',
   'package.version',
);
```

## Key Files Reference

- **Intention Lifecycle**: `api/src/intention/intention.service.ts` (open, start, end, close)
- **Validation System**: `api/src/intention/validation/` (rule-based architecture)
    - **Rule Engines**: `validation-rule.engine.ts`, `intention-validation-rule.engine.ts`
    - **Action Rules**: `rules/` directory (9 action-level validation rules)
    - **Intention Rules**: `intention-rules/` directory (2 intention-level validation rules)
    - **Documentation**: `docs/dev_validation_rules.md` (architecture and Drools migration guide)
- **Action Service**: `api/src/intention/action.service.ts` (builds `DecisionContext`, runs the rule engine per action)
- **Graph Queries**: `api/src/persistence/interfaces/graph.repository.ts` + `api/src/persistence/mongo/graph-mongo.repository.ts` (`$graphLookup` aggregations)
- **MongoDB Repos**: `api/src/persistence/mongo/*.repository.ts` (MikroORM queries)
- **Email Templates**: `scripts/db/templates/*.ejs` (EJS + inline CSS), loaded via `SystemRepository.getCommunicationTemplate(key)`
## Documentation

Comprehensive docs in `docs/` directory served via GitHub Pages:
- `dev_intention_*.md`: Intention system deep dives (actions, event, lifecycle, usage, user)
- `dev_validation_rules.md`: Validation rule architecture and Drools migration guide
- `dev_vault*.md`: HashiCorp Vault guides (overview + for developers)
- `dev_queue_consumers.md` / `operations_communication_queue.md`: queue/consumer and communication queue operation
- `dev_mongodb.md`, `dev_dto_entities.md`, `dev_env_vars.md`: persistence, DTO/entity, and env var guides
- `operations_*.md`: Admin/ops guides (audit, JWT, OpenSearch, GitHub/Kubernetes sync, internal user)
- `ops_*.md`: Team management guides

When adding features, update relevant docs and link from `docs/_sidebar.md`.

## TypeScript Conventions

- **Do not prefix interfaces with "I"**: Use `ValidationRule` not `IValidationRule`
- **Sentence case for user messages**: Follow BC Gov Style Guide for all user-facing text
- **No emojis**: Use plain text in all messages and documentation
