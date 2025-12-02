# NR Broker AI Agent Instructions

## Project Overview

NR Broker is a deployment business intelligence tool that automates access to HashiCorp Vault secrets, audits software deployment activities, and enables access automation. It's built with NestJS (backend) and Angular (UI), using MongoDB for persistence and a graph-based data model for relationships.

**Core Concept**: Teams use "intentions" (validated action requests) to interact with Broker. An intention contains actions (build, install, provision, etc.) that are validated against business rules before execution. All activity is audited.

## Architecture

### Intention-Based Workflow System
The system revolves around **intentions** - validated requests containing **actions** that describe what a team wants to do:

1. **Open Intention**: Client sends actions → Broker validates against business rules → Returns tokens if valid
2. **Start Action**: Optional lifecycle tracking (started state)
3. **Execute Work**: Client performs actual work (e.g., deploy, provision secrets)
4. **End Action**: Optional lifecycle tracking (ended state)
5. **Close Intention**: Finalizes the intention (auto-ends started actions)

See `src/intention/intention.service.ts` and `docs/dev_intention_lifecycle.md` for implementation.

### Multi-Repository Pattern
- **Backend**: NestJS monorepo (`src/`) - ~30 modules organized by domain
- **Frontend**: Angular SPA (`ui/`) - separate package.json, built independently
- **DTOs**: Duplicated between backend (`src/*/dto/`) and frontend (`ui/src/app/service/*/dto/`) - must be kept in sync manually

### Graph-Based Data Model
Uses vertices and edges to represent relationships between entities:
- **VertexEntity** (`src/persistence/entity/vertex.entity.ts`): Represents collections (project, service, environment, etc.)
- **EdgeEntity** (`src/persistence/entity/edge.entity.ts`): Named relationships between vertices (e.g., "component" links project→service)
- **GraphRepository** queries relationships using `$graphLookup` aggregations
- Environment hierarchy uses `position` field: 0=production, 10=test, 20=development

Example: Service deployment validation checks if build exists in previous environment by traversing intentions→builds→environments.

### Entity vs Embeddable Pattern (MikroORM)
- **@Entity()**: Top-level collections with `_id` (ObjectId) primary key - stored as separate MongoDB documents
  - Examples: `IntentionEntity`, `BrokerAccountEntity`, `ServiceEntity`, `PackageBuildEntity`
- **@Embeddable()**: Nested objects within entities - no separate documents
  - Examples: `ActionEmbeddable`, `TransactionEmbeddable`, `VaultConfigEmbeddable`
  - Actions use discriminator pattern: 9 action types inherit from `ActionEmbeddable`

### Module Organization
```
src/
├── intention/      # Core workflow engine (open, start, end, close)
├── collection/     # CRUD for graph collections (project, service, user, etc.)
├── graph/          # Relationship queries and graph sync
├── persistence/    # Repository abstractions + MongoDB implementations
├── auth/           # JWT authentication + guards
├── vault/          # HashiCorp Vault integration
├── audit/          # Activity logging + Kinesis streaming
├── provision/      # Vault secret provisioning API
├── token/          # Broker token generation
└── communication/  # Email notifications (EJS templates)
```

## Key Conventions

### Validation Architecture (Rule-Based System)

The validation system uses a **rule-based architecture** compatible with DMN (Decision Model and Notation) and Drools rule engines. Business rules are separated into individual, testable classes that evaluate a common decision context.

**Two-Phase Validation:**
1. **Intention-Level** (`IntentionValidationRuleEngine`): Validates before actions are processed (JWT blocked, account binding, etc.)
2. **Action-Level** (`ValidationRuleEngine`): Validates individual actions against business rules

**Architecture Components:**
- **Decision Contexts**: `DecisionContext` (action-level), `IntentionDecisionContext` (intention-level) - contain all facts for validation
- **Validation Rules**: Each rule implements `ValidationRule` or `IntentionValidationRule` interface
- **Rule Engines**: Orchestrate rule execution in priority order, short-circuit on first failure
- **Base Classes**: `BaseValidationRule` and `BaseIntentionValidationRule` provide helper methods

**Key Files:**
- **Interfaces**: `src/intention/validation/decision-context.interface.ts`, `validation-rule.interface.ts`
- **Intention Rules**: `src/intention/validation/intention-rules/` (JWT blocked, account binding)
- **Action Rules**: `src/intention/validation/rules/` (8 rules: user set, vault env, account bound project, target service, database access, package build, package installation, assisted delivery)
- **Engines**: `validation-rule.engine.ts`, `intention-validation-rule.engine.ts`
- **Documentation**: `docs/dev_validation_rules.md`

**Adding New Validation Rules:**
1. Create rule class extending `BaseValidationRule` or `BaseIntentionValidationRule`
2. Implement `getRuleName()`, `evaluate()`, and optionally `getPriority()`
3. Add to module providers in `intention.module.ts`
4. Inject into appropriate rule engine constructor
5. Update documentation

**Migration Path to Drools:**
- Current TypeScript rules map directly to DRL rules or DMN decision tables
- `DecisionContext` → Working Memory Facts
- `ValidationRule` → DRL Rule
- Rule priority → Salience
- See `docs/dev_validation_rules.md` for complete migration guide

**Validation Messages:**
All validation messages follow **BC Gov Style Guide**:
- Sentence case (not title case)
- Plain language (no jargon)
- Clear actionable resolution steps
- Front-loaded important information
- Example: `"Build must be deployed to test environment before deploying to production. Deploy to test first, then retry this installation."`

### Repository Pattern
Three-layer abstraction in `src/persistence/`:
1. **Interface** (`interfaces/*.repository.ts`): Abstract class defining contract
2. **MongoDB Implementation** (`mongo/*-mongo.repository.ts`): MikroORM queries
3. **Module Export** (`persistence.module.ts`): Dependency injection

Example flow:
```typescript
// Interface
export abstract class IntentionRepository {
  public abstract getIntention(id: string): Promise<IntentionEntity | null>;
}

// Implementation uses MikroORM EntityManager
export class IntentionMongoRepository extends IntentionRepository {
  async getIntention(id: string) {
    return this.em.findOne(IntentionEntity, { _id: new ObjectId(id) });
  }
}

// Service injection
constructor(private readonly intentionRepository: IntentionRepository) {}
```

### Action Discriminator Pattern
Actions use `class-transformer` discriminators for polymorphism:
```typescript
@Type(() => ActionDto, {
  discriminator: {
    property: 'action',
    subTypes: [
      { value: PackageInstallationActionDto, name: 'package-installation' },
      { value: PackageBuildActionDto, name: 'package-build' },
      // ... 9 total action types
    ],
  },
})
actions!: ActionDto[];
```

Backend entities mirror this with `ActionEmbeddable` subclasses. Validate using `instanceof` checks.

### Environment Variables & Secrets
- **Local Development**: `scripts/setenv-common.sh` (gitignored, copy from `.tmp` template)
- **Secret Management**: `env.hcl` for envconsul (Vault integration)
- **Required Vars**: `BROKER_URL`, `MONGODB_URL`, `OIDC_*`, `VAULT_*`, `AWS_*` (for Kinesis/OpenSearch)
- Constants defined in `src/constants.ts`

## Development Workflows

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
# Backend unit tests (Jest)
npm test
npm run test:cov

# Backend e2e tests
npm run test:e2e

# Frontend tests (Vitest)
cd ui && npm test
```

### Database Migrations
No formal migrations - MongoDB schema-less. Entities evolve in-place:
1. Update entity class (`src/persistence/entity/*.entity.ts`)
2. Update DTO (`src/persistence/dto/*.dto.ts` + `ui/src/app/service/persistence/dto/*.dto.ts`)
3. MikroORM handles new fields automatically (nullable for optional fields)
4. Production data backfilled via admin scripts or background jobs

### Adding New Action Types
1. Create DTO: `src/intention/dto/xxx-action.dto.ts` (validation decorators)
2. Create Embeddable: `src/intention/entity/xxx-action.embeddable.ts`
3. Add discriminator entry to `IntentionDto.actions` array
4. Create validation rule(s) in `src/intention/validation/rules/` if needed
5. Register validation rules in `intention.module.ts` and inject into `ValidationRuleEngine`
6. Mirror DTO in `ui/src/app/service/intention/dto/`
7. Update API docs: `docs/dev_intention_actions.md`

## Common Pitfalls

1. **DTO Sync**: Backend/frontend DTOs must match exactly - scripts/copy-dto.sh helps automate copying from backend to frontend
2. **ObjectId Conversions**: MongoDB ObjectIds need `.toString()` for responses, `new ObjectId()` for queries
3. **Async Validation**: Action validation is async (DB lookups) - must `await` all validators
4. **Intention TTL**: Default 10min - adjust for long-running actions with `?ttl=1800` (max 30min)
5. **MikroORM Context**: Use `@CreateRequestContext()` decorator for cron jobs to ensure proper EntityManager scope
6. **Graph Lookups**: Use `GraphRepository` methods instead of raw aggregations - handles depth limits and circular references

## Communication Style (BC Gov)

All user-facing messages (emails, error messages, validation failures) follow BC Gov Style Guide:
- **Sentence case**: "Token expires in 7 days" not "Token Expires In 7 Days". The names of collections and entities are exceptions and use title case.
- **No emojis**: Use plain text
- **Front-load key info**: Put most important details first
- **Plain language**: Avoid jargon, use everyday words
- **Actionable**: Tell users exactly how to fix issues

Example:
```typescript
// ❌ Bad
return new ActionRuleViolationEmbeddable(
  '🚫 ERROR: Pre-Deployment Validation Failed - Build Artifact Missing in Staging Environment',
  'package.version'
);

// ✅ Good
return new ActionRuleViolationEmbeddable(
  'Build must be deployed to test environment before deploying to production. Deploy to test first, then retry this installation.',
  'package.version'
);
```

## Key Files Reference

- **Intention Lifecycle**: `src/intention/intention.service.ts` (open, start, end, close)
- **Validation System**: `src/intention/validation/` (rule-based validation architecture)
  - **Rule Engines**: `validation-rule.engine.ts`, `intention-validation-rule.engine.ts`
  - **Action Rules**: `rules/` directory (8 action-level validation rules)
  - **Intention Rules**: `intention-rules/` directory (2 intention-level validation rules)
  - **Documentation**: `docs/dev_validation_rules.md` (architecture and Drools migration guide)
- **Action Service**: `src/intention/action.service.ts` (orchestrates validation via rule engine)
- **Graph Queries**: `src/graph/graph.repository.ts` (`$graphLookup` aggregations)
- **MongoDB Repos**: `src/persistence/mongo/*.repository.ts` (MikroORM queries)
- **Email Templates**: `src/communication/templates/*.ejs` (EJS + inline CSS)
- **API Docs**: Swagger at `/api` endpoint (NestJS auto-generated)
- **Architecture Diagram**: `docs/images/broker_architecture.png`
- **Integration Guide**: `docs/dev_integrate_overview.md`

## Documentation

Comprehensive docs in `docs/` directory served via GitHub Pages:
- `dev_intention_*.md`: Intention system deep dives
- `dev_validation_rules.md`: Validation rule architecture and Drools migration guide
- `dev_*.md`: Developer guides (MongoDB, Vault, DTOs, etc.)
- `operations_*.md`: Admin/ops guides (audit, JWT, OpenSearch, etc.)
- `ops_*.md`: Team management guides

When adding features, update relevant docs and link from `docs/_sidebar.md`.

## TypeScript Conventions

- **Do not prefix interfaces with "I"**: Use `ValidationRule` not `IValidationRule`
- **Sentence case for user messages**: Follow BC Gov Style Guide for all user-facing text
- **No emojis**: Use plain text in all messages and documentation
