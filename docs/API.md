# ArchiScribe MCP Server - API Documentation

## Overview

The ArchiScribe MCP Server provides a comprehensive API for manipulating ArchiMate models through the Model Context Protocol (MCP). This document describes the internal APIs, types, and utilities available in the codebase.

## Table of Contents

- [Model Manipulation API](#model-manipulation-api)
- [Validation System](#validation-system)
- [Error Handling](#error-handling)
- [Performance Utilities](#performance-utilities)
- [Utilities](#utilities)

## Model Manipulation API

### ModelManipulator

The `ModelManipulator` class provides CRUD operations for ArchiMate models.

**Location:** `src/model/manipulator.ts`

#### Key Methods

##### Element Operations

- **`createElement(data: CreateElementInput): Promise<ElementObject>`**
  - Creates a new element in the model
  - Validates element type and required fields
  - Auto-generates identifier if not provided
  - Throws `ValidationError` if validation fails
  - Throws `DuplicateError` if identifier already exists

- **`getElement(id: string): ElementObject | null`**
  - Retrieves an element by identifier
  - Returns `null` if element not found
  - Performance: < 100ms for typical models

- **`updateElement(id: string, data: UpdateElementInput): Promise<ElementObject>`**
  - Updates an existing element
  - Validates changes before applying
  - Throws `NotFoundError` if element doesn't exist
  - Throws `ValidationError` if validation fails

- **`deleteElement(id: string, options?: DeleteOptions): Promise<void>`**
  - Deletes an element from the model
  - If `cascade: true`, deletes dependent relationships and removes from views
  - Throws `NotFoundError` if element doesn't exist
  - Throws `ReferentialIntegrityError` if element has dependencies and cascade is false

##### Relationship Operations

- **`createRelationship(data: CreateRelationshipInput): Promise<RelationshipObject>`**
  - Creates a new relationship between elements
  - Validates relationship type compatibility
  - Validates source and target elements exist
  - Throws `ValidationError` if validation fails
  - Throws `NotFoundError` if source or target element not found

- **`getRelationship(id: string): RelationshipObject | null`**
  - Retrieves a relationship by identifier
  - Returns `null` if relationship not found

- **`updateRelationship(id: string, data: UpdateRelationshipInput): Promise<RelationshipObject>`**
  - Updates an existing relationship
  - Validates changes before applying
  - Throws `NotFoundError` if relationship doesn't exist

- **`deleteRelationship(id: string): Promise<void>`**
  - Deletes a relationship from the model
  - Updates element references automatically
  - Throws `NotFoundError` if relationship doesn't exist

##### View Operations

- **`createView(data: CreateViewInput): Promise<ViewObject>`**
  - Creates a new view in the model
  - Validates elements and relationships exist if provided
  - Throws `ValidationError` if validation fails

- **`getView(id: string): ViewObject | null`**
  - Retrieves a view by identifier
  - Returns `null` if view not found

- **`updateView(id: string, data: UpdateViewInput): Promise<ViewObject>`**
  - Updates an existing view
  - Validates changes before applying
  - Throws `NotFoundError` if view doesn't exist

- **`deleteView(id: string): Promise<void>`**
  - Deletes a view from the model
  - Throws `NotFoundError` if view doesn't exist

##### Transaction Support

- **`beginTransaction(): ModelTransaction`**
  - Starts a new transaction for atomic operations
  - All operations within transaction are rolled back on error

- **`commitTransaction(transaction: ModelTransaction): void`**
  - Commits a transaction, applying all changes

- **`rollbackTransaction(transaction: ModelTransaction): void`**
  - Rolls back a transaction, discarding all changes

### ModelLoader

The `ModelLoader` class loads ArchiMate models from XML files.

**Location:** `src/model/loader.ts`

#### Key Methods

- **`load(): ModelData`**
  - Loads and parses an ArchiMate XML file
  - Caches the result for subsequent calls
  - Automatically invalidates cache when file changes
  - Performance: < 100ms for typical models
  - Throws error if file cannot be read or parsed

### ArchiMateXMLBuilder

The `ArchiMateXMLBuilder` class serializes model data to ArchiMate XML format.

**Location:** `src/model/persistence.ts`

#### Key Methods

- **`serialize(model: ModelData, options?: SerializationOptions): string`**
  - Serializes model data to ArchiMate Exchange File Format XML
  - Validates output structure
  - Performance: < 2s for typical models
  - Returns XML string

## Validation System

### XSDValidator

Validates XML against ArchiMate 3.1 XSD schemas.

**Location:** `src/utils/xsd-validator.ts`

#### Key Methods

- **`validateModel(xmlString: string): ValidationResult`**
  - Validates XML against ArchiMate 3.1 Model XSD schema
  - Performance: < 1s for typical models (< 1000 elements)
  - Returns validation result with errors if any

- **`validateView(xmlString: string): ValidationResult`**
  - Validates XML against ArchiMate 3.1 View XSD schema
  - Returns validation result with errors if any

- **`validateDiagram(xmlString: string): ValidationResult`**
  - Validates XML against ArchiMate 3.1 Diagram XSD schema
  - Returns validation result with errors if any

### BusinessRulesValidator

Validates business rules for ArchiMate models.

**Location:** `src/utils/business-rules-validator.ts`

#### Key Methods

- **`validateRelationshipCompatibility(...): ValidationResult`**
  - Validates relationship type compatibility with source and target element types
  - Checks against ArchiMate specification rules

- **`validateElementType(elementType: string): ValidationResult`**
  - Validates element type against ArchiMate specification
  - Returns validation result

- **`validateViewIntegrity(...): ValidationResult`**
  - Validates view integrity (elements and relationships exist)
  - Returns validation result

## Error Handling

### Error Types

All errors extend `ModelManipulationError` and include:
- **`code`**: Error code (e.g., `ELEMENT_NOT_FOUND`)
- **`message`**: Human-readable error message
- **`suggestions`**: Array of actionable suggestions
- **`context`**: Additional context about the error
- **`details`**: Detailed error information

#### Error Classes

- **`ValidationError`**: Validation failures
  - Code: `VALIDATION_FAILED`
  - Includes validation result details

- **`NotFoundError`**: Entity not found
  - Codes: `ELEMENT_NOT_FOUND`, `RELATIONSHIP_NOT_FOUND`, `VIEW_NOT_FOUND`
  - Includes entity type and identifier

- **`DuplicateError`**: Duplicate entity
  - Codes: `ELEMENT_DUPLICATE`, `RELATIONSHIP_DUPLICATE`, `VIEW_DUPLICATE`
  - Includes entity type and identifier

- **`ReferentialIntegrityError`**: Referential integrity violations
  - Code: `REFERENTIAL_INTEGRITY_VIOLATION`
  - Includes dependent entities list

### Error Codes

See `src/utils/error-codes.ts` for complete list of error codes and their definitions.

### Usage Example

```typescript
try {
  const element = await manipulator.createElement({
    type: 'ApplicationComponent',
    name: 'My Component'
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    console.error('Suggestions:', error.suggestions);
    console.error('Details:', error.details);
  } else if (error instanceof NotFoundError) {
    console.error('Not found:', error.message);
    console.error('Suggestions:', error.suggestions);
  }
}
```

## Performance Utilities

### Performance Benchmarking

**Location:** `src/utils/performance.ts`

#### Key Functions

- **`measurePerformance<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<{ result: T; metrics: PerformanceMetrics }>`**
  - Measures performance of an async operation
  - Returns result and performance metrics

- **`benchmark(operation: string, fn: () => Promise<any>, iterations?: number, targetMs?: number): Promise<BenchmarkResult>`**
  - Runs a benchmark with multiple iterations
  - Calculates statistics (avg, min, max, median, P95, P99)
  - Compares against performance target

#### Performance Targets

- **Read Operations**: < 100ms
- **Write Operations**: < 500ms
- **Validation Operations**: < 1s
- **Model Save Operations**: < 2s

#### Usage Example

```typescript
import { benchmark, PERFORMANCE_TARGETS } from './utils/performance';

const result = await benchmark(
  'Load Model',
  async () => {
    loader.load();
  },
  10,
  PERFORMANCE_TARGETS.READ_OPERATION
);

console.log(formatBenchmarkResult(result));
```

## Utilities

### Logger

**Location:** `src/utils/logger.ts`

Daily file logger with audit capabilities.

#### Key Features

- Daily log file rotation
- Structured JSON logging
- Audit logging for tool invocations and HTTP requests
- Performance tracking (durationMs)
- Configurable log levels

### Validation Reporter

**Location:** `src/utils/validation-reporter.ts`

Generates human-readable validation reports.

## Type Definitions

### Core Types

**Location:** `src/model/types.ts`

- `ModelData`: Complete model structure
- `ElementObject`: Element representation
- `RelationshipObject`: Relationship representation
- `ViewObject`: View representation

### Manipulator Types

**Location:** `src/model/manipulator-types.ts`

- `CreateElementInput`: Input for creating elements
- `UpdateElementInput`: Input for updating elements
- `CreateRelationshipInput`: Input for creating relationships
- `UpdateRelationshipInput`: Input for updating relationships
- `CreateViewInput`: Input for creating views
- `UpdateViewInput`: Input for updating views
- `ValidationResult`: Validation result structure

## Examples

See `src/tests/` directory for comprehensive examples of API usage.
