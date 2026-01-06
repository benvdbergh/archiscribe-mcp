# Test Fixtures

This directory contains comprehensive test data for ArchiMate model operations.

## Files

### `empty-model.xml`
- **Purpose**: Edge case - empty model with no elements, relationships, or views
- **Use Cases**: Testing model creation, validation of empty models, error handling

### `basic-model.xml`
- **Purpose**: Minimal valid model with basic elements and relationships
- **Contains**: 
  - 3 elements (Business Actor, Application Component, Device)
  - 2 relationships (Serving, Assignment)
- **Use Cases**: Basic CRUD operations, simple validation tests

### `comprehensive-elements.xml`
- **Purpose**: Model covering all major ArchiMate 3.1 element types
- **Contains**: 
  - Business Layer elements (Actor, Role, Process, Function, etc.)
  - Application Layer elements (Component, Collaboration, Interface, etc.)
  - Technology Layer elements (Node, Device, System Software, etc.)
  - Motivation Layer elements (Stakeholder, Driver, Goal, etc.)
  - Strategy Layer elements (Resource, Capability, Course of Action, etc.)
  - Physical Layer elements (Equipment, Facility, Material)
  - Implementation & Migration Layer elements (Work Package, Deliverable, etc.)
- **Use Cases**: Element type validation, element creation/update tests, type compatibility checks

### `comprehensive-relationships.xml`
- **Purpose**: Model covering various ArchiMate 3.1 relationship types
- **Contains**:
  - Structural relationships (Composition, Aggregation, Assignment, Realization, Serving)
  - Dependency relationships (Access with different types, Influence, Association)
  - Dynamic relationships (Flow, Triggering)
  - Other relationships (Specialization, Junction)
- **Use Cases**: Relationship type validation, relationship creation/update tests, relationship constraints

### `model-with-properties.xml`
- **Purpose**: Model demonstrating property definitions and property assignments
- **Contains**:
  - Property definitions (Cost, Version, Status, Repository)
  - Elements with properties
  - Relationships with properties
- **Use Cases**: Property management tests, property validation, property CRUD operations

### `model-with-views.xml`
- **Purpose**: Model demonstrating view structures
- **Contains**:
  - Multiple views with different structures
  - View nodes (elements in views)
  - View connections (relationships in views)
  - Node hierarchy (nested nodes)
  - View styles
- **Use Cases**: View management tests, view CRUD operations, view structure validation

## Usage

These fixtures can be used in tests:

```typescript
import { ModelLoader } from '../model/loader';

const loader = new ModelLoader('src/tests/fixtures/basic-model.xml');
const model = loader.load();
```

## Validation

All fixtures should:
- ✅ Load successfully with ModelLoader
- ✅ Validate against ArchiMate 3.1 XSD schemas
- ✅ Be openable in Archi and other ArchiMate tools
- ✅ Cover edge cases and common scenarios

## Maintenance

When adding new fixtures:
1. Ensure they validate against XSD schemas
2. Document their purpose in this README
3. Include them in test suites
4. Keep them minimal but complete
