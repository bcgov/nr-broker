# Validation Rule Architecture

## Overview

The validation system has been refactored to use a rule-based architecture compatible with DMN (Decision Model and Notation) and Drools rule engines. This design separates business rules into individual, testable classes that evaluate a common decision context.

## Architecture Components

### 1. Intention-Level Decision Context (`intention-decision-context.interface.ts`)

The `IIntentionDecisionContext` interface represents the state needed for intention-level validations that occur before individual actions are validated. These are high-level business rules about whether an intention can be opened at all.

```typescript
interface IIntentionDecisionContext {
  brokerJwt: BrokerJwtEmbeddable | null;
  registryJwt: JwtRegistryEntity | null;
  account: BrokerAccountEntity | null;
}
```

### 2. Action-Level Decision Context (`decision-context.interface.ts`)

The `IDecisionContext` interface represents the complete state (facts) needed for validation. In DMN/Drools terminology, this is the "Working Memory" containing all facts that rules evaluate against.

```typescript
interface IDecisionContext {
  intention: IntentionEntity;
  action: ActionEmbeddable;
  account: BrokerAccountEntity | null;
  accountBoundProjects: BrokerAccountProjectMapDto | null;
  user: UserEntity | null;
  targetServices: string[];
  requireProjectExists: boolean;
  requireServiceExists: boolean;
}
```

### 2. Action-Level Decision Context (`decision-context.interface.ts`)

The `IDecisionContext` interface represents the complete state (facts) needed for action validation. In DMN/Drools terminology, this is the "Working Memory" containing all facts that rules evaluate against.

```typescript
interface IDecisionContext {
  intention: IntentionEntity;
  action: ActionEmbeddable;
  account: BrokerAccountEntity | null;
  accountBoundProjects: BrokerAccountProjectMapDto | null;
  user: UserEntity | null;
  targetServices: string[];
  requireProjectExists: boolean;
  requireServiceExists: boolean;
}
```

### 3. Validation Rules

#### Intention-Level Rules (`intention-validation-rule.interface.ts`)

Intention-level rules implement `IIntentionValidationRule` and validate before actions are processed:

```typescript
interface IIntentionValidationRule {
  getRuleName(): string;
  evaluate(context: IIntentionDecisionContext): Promise<IIntentionDecisionResult>;
  getPriority?(): number;
}
```

#### Action-Level Rules (`validation-rule.interface.ts`)

Each action validation rule implements `IValidationRule`:

```typescript
interface IValidationRule {
  getRuleName(): string;
  evaluate(context: IDecisionContext): Promise<IDecisionResult>;
  getPriority?(): number;
}
```

Rules are independent, stateless, and return `IDecisionResult`:

```typescript
interface IDecisionResult {
  valid: boolean;
  message?: string;
  key?: string;
}
```

### 4. Validation Rule Engines

#### Intention Validation Rule Engine (`intention-validation-rule.engine.ts`)

Orchestrates intention-level rule execution before actions are validated:
- Registers intention-level validation rules
- Sorts by priority
- Throws exception on first failure

#### Action Validation Rule Engine (`validation-rule.engine.ts`)

The `ValidationRuleEngine` orchestrates action rule execution:
- Registers all validation rules
- Sorts by priority (lower numbers execute first)
- Executes rules sequentially
- Short-circuits on first failure

### 5. Rule Classes

#### Intention-Level Rules (`validation/intention-rules/`)

| Rule Class | Priority | Purpose |
|------------|----------|---------|
| `JwtBlockedValidationRule` | 10 | Verify JWT is not blocked |
| `AccountBindingValidationRule` | 20 | Verify JWT bound to broker account |

#### Action-Level Rules (`validation/rules/`)

| Rule Class | Priority | Purpose |
|------------|----------|---------|
| `UserSetValidationRule` | 10 | Verify user is mapped to action |
| `VaultEnvValidationRule` | 20 | Validate Vault environment |
| `AccountBoundProjectValidationRule` | 30 | Check project/service authorization |
| `TargetServiceValidationRule` | 40 | Verify target service configuration |
| `DatabaseAccessValidationRule` | 50 | Database access authorization |
| `PackageBuildValidationRule` | 60 | Package build business rules |
| `PackageInstallationValidationRule` | 70 | Package installation requirements |
| `AssistedDeliveryValidationRule` | 80 | User authorization for environment changes |

## Usage

### Current Implementation (TypeScript)

```typescript
// IntentionService.open() validates intention-level rules first
try {
  await this.intentionValidationRuleEngine.validate({
    brokerJwt,
    registryJwt,
    account,
  });
} catch (error) {
  throw new BadRequestException({...});
}

// Then validates action-level rules
const decisionContext: IDecisionContext = {
  intention,
  action,
  account,
  accountBoundProjects,
  user,
  targetServices,
  requireProjectExists,
  requireServiceExists,
};

const ruleViolation = await this.validationRuleEngine.validate(decisionContext);
```

### Adding New Rules

1. Create new rule class in `validation/rules/`:

```typescript
@Injectable()
export class MyNewValidationRule extends BaseValidationRule {
  getRuleName(): string {
    return 'my-new-validation';
  }

  getPriority(): number {
    return 45; // Execute after target service, before database access
  }

  async evaluate(context: IDecisionContext): Promise<IDecisionResult> {
    if (/* validation fails */) {
      return this.fail('Error message', 'field.key');
    }
    return this.pass();
  }
}
```

2. Add to `validation/rules/index.ts`:

```typescript
export * from './my-new-validation.rule';
```

3. Register in `intention.module.ts`:

```typescript
providers: [
  // ... existing providers
  MyNewValidationRule,
],
```

4. Inject into `ValidationRuleEngine` constructor:

```typescript
constructor(
  // ... existing rules
  private readonly myNewValidationRule: MyNewValidationRule,
) {
  this.rules = [
    // ... existing rules
    this.myNewValidationRule,
  ].sort((a, b) => (a.getPriority() ?? 100) - (b.getPriority() ?? 100));
}
```

## Migrating to Drools

The current architecture is designed to facilitate migration to Drools Business Rules Management System (BRMS). Here's how the concepts map:

### Mapping to Drools Concepts

| Current TypeScript | Drools Equivalent |
|-------------------|-------------------|
| `IDecisionContext` | Working Memory Facts |
| `IValidationRule` | DRL Rule or DMN Decision |
| `ValidationRuleEngine` | KieSession / StatelessKieSession |
| `IDecisionResult` | Rule Consequence / Output |
| `getPriority()` | Rule Salience |

### Migration Steps

1. **Install Drools Dependencies**

```xml
<!-- pom.xml for Java-based Drools -->
<dependency>
    <groupId>org.kie</groupId>
    <artifactId>kie-api</artifactId>
</dependency>
<dependency>
    <groupId>org.drools</groupId>
    <artifactId>drools-core</artifactId>
</dependency>
```

Or use [drools-js](https://github.com/kiegroup/drools-js) for Node.js integration.

2. **Convert Rules to DRL**

Example: `UserSetValidationRule` → DRL:

```drl
package com.example.broker.validation

import com.example.broker.entities.*;

rule "user-set-validation"
    salience 90  // Priority: 10 → salience 90 (higher salience = earlier execution)
    when
        $context : DecisionContext(
            account == null || account.skipUserValidation == false,
            user == null
        )
    then
        DecisionResult result = new DecisionResult();
        result.setValid(false);
        result.setMessage("Unknown user. All actions required to be mapped to user. Does user exist with provided id or name and domain?");
        result.setKey("user.id");
        insert(result);
end
```

3. **Create DMN Decision Tables** (Alternative to DRL)

DMN provides visual decision modeling:

```xml
<!-- user-set-validation.dmn -->
<decision id="user-set-validation" name="User Set Validation">
  <decisionTable hitPolicy="FIRST">
    <input label="Skip User Validation">
      <inputExpression>
        <text>context.account.skipUserValidation</text>
      </inputExpression>
    </input>
    <input label="User Exists">
      <inputExpression>
        <text>context.user != null</text>
      </inputExpression>
    </input>
    <output label="Valid" />
    <output label="Message" />
    <rule>
      <inputEntry><text>true</text></inputEntry>
      <inputEntry><text>-</text></inputEntry>
      <outputEntry><text>true</text></outputEntry>
      <outputEntry><text>""</text></outputEntry>
    </rule>
    <rule>
      <inputEntry><text>false</text></inputEntry>
      <inputEntry><text>false</text></inputEntry>
      <outputEntry><text>false</text></outputEntry>
      <outputEntry><text>"Unknown user..."</text></outputEntry>
    </rule>
  </decisionTable>
</decision>
```

4. **Replace ValidationRuleEngine with KieSession**

```typescript
// Pseudocode for Drools integration
export class DroolsValidationRuleEngine {
  private kieSession: StatelessKieSession;

  constructor() {
    const kieContainer = KieServices.Factory.get().getKieClasspathContainer();
    this.kieSession = kieContainer.newStatelessKieSession();
  }

  async validate(context: IDecisionContext): Promise<ActionRuleViolationEmbeddable | null> {
    const results: DecisionResult[] = [];
    
    // Insert facts into working memory
    this.kieSession.execute([context], results);
    
    // Find first failure
    const failure = results.find(r => !r.valid);
    return failure 
      ? new ActionRuleViolationEmbeddable(failure.message, failure.key)
      : null;
  }
}
```

5. **Update Module Registration**

Replace TypeScript rule classes with Drools engine:

```typescript
@Module({
  providers: [
    DroolsValidationRuleEngine, // Replaces ValidationRuleEngine + all rule classes
    // ... other services
  ],
})
export class IntentionModule {}
```

## Benefits of Rule-Based Architecture

### Current Benefits (TypeScript)

- **Separation of Concerns**: Each rule is isolated and testable
- **Priority-Based Execution**: Optimize performance by running cheap validations first
- **Maintainability**: Easy to add/remove/modify rules without touching core service
- **Readability**: Business rules are self-documenting with clear names and comments

### Additional Benefits with Drools

- **Non-Developer Rule Management**: Business analysts can modify rules via DMN visual tools
- **Rule Versioning**: Drools supports versioned rule sets for A/B testing
- **Complex Event Processing**: Advanced pattern matching and temporal reasoning
- **Performance Optimization**: Rete algorithm for efficient rule evaluation
- **Business Rule Repository**: Centralized rule management via Drools Workbench

## Testing

Test individual rules in isolation:

```typescript
describe('UserSetValidationRule', () => {
  let rule: UserSetValidationRule;

  beforeEach(() => {
    rule = new UserSetValidationRule();
  });

  it('should pass when user is set', async () => {
    const context: IDecisionContext = {
      user: mockUser,
      account: null,
      // ... other context
    };

    const result = await rule.evaluate(context);
    expect(result.valid).toBe(true);
  });

  it('should fail when user is null', async () => {
    const context: IDecisionContext = {
      user: null,
      account: null,
      // ... other context
    };

    const result = await rule.evaluate(context);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Unknown user');
  });
});
```

## References

- [DMN (Decision Model and Notation)](https://www.omg.org/dmn/)
- [Drools Documentation](https://docs.drools.org/)
- [Drools DMN Engine](https://docs.drools.org/latest/drools-docs/html_single/#dmn-con_dmn-models)
- [Rete Algorithm](https://en.wikipedia.org/wiki/Rete_algorithm) - Pattern matching algorithm used by Drools
