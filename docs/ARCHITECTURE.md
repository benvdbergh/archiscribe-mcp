# ArchiScribe MCP Server - Architecture Documentation

## Overview

The ArchiScribe MCP Server is a Model Context Protocol (MCP) server that provides CRUD operations and validation for ArchiMate models. It enables AI coding assistants to interact with ArchiMate architectural models.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client (Claude/Cursor)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ MCP Protocol (JSON-RPC)
                         │
┌────────────────────────▼────────────────────────────────────┐
│              MCP Server (src/mcp/server.ts)                 │
│  - Handles MCP protocol communication                        │
│  - Routes tool invocations                                   │
│  - Manages tool registration                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Tool Invocations
                         │
┌────────────────────────▼────────────────────────────────────┐
│            MCP Tools (src/mcp/tools.ts)                      │
│  - Element Management Tools                                  │
│  - Relationship Management Tools                             │
│  - View Management Tools                                     │
│  - Validation Tools                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ API Calls
                         │
┌────────────────────────▼────────────────────────────────────┐
│        Model Manipulator (src/model/manipulator.ts)           │
│  - CRUD Operations                                          │
│  - Transaction Support                                       │
│  - Validation Integration                                    │
└────────┬──────────────────────────┬──────────────────────────┘
         │                          │
         │                          │
┌────────▼──────────┐    ┌─────────▼──────────┐
│  Model Loader     │    │  XML Builder        │
│  (loader.ts)      │    │  (persistence.ts)   │
│  - Load XML       │    │  - Serialize XML    │
│  - Parse Model    │    │  - Save Model      │
│  - Cache          │    │  - Backup          │
└───────────────────┘    └────────────────────┘
         │                          │
         │                          │
         └──────────┬───────────────┘
                    │
         ┌──────────▼──────────┐
         │   Validation Layer  │
         │  - XSD Validator     │
         │  - Business Rules    │
         │  - Reporter          │
         └─────────────────────┘
```

## Component Details

### 1. MCP Server Layer

**Location:** `src/mcp/`

#### server.ts
- Implements MCP protocol server
- Handles JSON-RPC requests
- Manages tool registration
- Error handling and response formatting

#### tools.ts
- Defines all MCP tools
- Maps tool invocations to ModelManipulator methods
- Formats responses as markdown
- Error handling and logging

### 2. Model Layer

**Location:** `src/model/`

#### manipulator.ts
- Core CRUD operations for elements, relationships, and views
- Transaction support for atomic operations
- Validation integration
- Error handling with detailed messages

#### loader.ts
- Loads ArchiMate XML files
- Parses XML to internal ModelData structure
- File watching for automatic cache invalidation
- Error handling for malformed XML

#### persistence.ts
- Serializes ModelData to ArchiMate XML format
- Model saving with backup support
- Validation before save
- Error handling for save failures

#### types.ts
- TypeScript type definitions for model structures
- ElementObject, RelationshipObject, ViewObject
- ModelData structure

#### manipulator-types.ts
- Input/output types for CRUD operations
- Error type definitions
- Validation result types

### 3. Validation Layer

**Location:** `src/utils/`

#### xsd-validator.ts
- Validates XML against ArchiMate 3.1 XSD schemas
- Supports model, view, and diagram validation
- Returns detailed validation errors

#### business-rules-validator.ts
- Validates ArchiMate business rules
- Relationship compatibility checking
- Element type validation
- View integrity validation

#### validation-reporter.ts
- Generates human-readable validation reports
- Formats errors, warnings, and suggestions
- Markdown output for MCP tools

### 4. Utilities

**Location:** `src/utils/`

#### logger.ts
- Daily file logging
- Structured JSON logs
- Audit logging for tool invocations
- Performance tracking

#### errors.ts
- HTTP error response utilities
- JSON-RPC error formatting
- Error response helpers

#### error-codes.ts
- Centralized error code definitions
- Error message formatting
- Actionable suggestions for errors

#### performance.ts
- Performance benchmarking utilities
- Operation timing
- Performance target validation

## Data Flow

### Read Operation Flow

```
1. MCP Client → MCP Server (tool invocation)
2. MCP Server → MCP Tools (route to tool handler)
3. MCP Tools → ModelManipulator (getElement/getRelationship/getView)
4. ModelManipulator → ModelData (in-memory access)
5. ModelManipulator → MCP Tools (return result)
6. MCP Tools → MCP Server (format as markdown)
7. MCP Server → MCP Client (JSON-RPC response)
```

### Write Operation Flow

```
1. MCP Client → MCP Server (tool invocation with data)
2. MCP Server → MCP Tools (route to tool handler)
3. MCP Tools → ModelManipulator (createElement/updateElement/etc.)
4. ModelManipulator → Validation (validate input)
5. ModelManipulator → ModelData (modify in-memory)
6. ModelManipulator → MCP Tools (return result)
7. MCP Tools → MCP Server (format as markdown)
8. MCP Server → MCP Client (JSON-RPC response)
```

### Save Operation Flow

```
1. MCP Client → MCP Server (SaveModel tool invocation)
2. MCP Server → MCP Tools (route to tool handler)
3. MCP Tools → ModelManipulator (saveModel)
4. ModelManipulator → Validation (optional validation)
5. ModelManipulator → XML Builder (serialize to XML)
6. XML Builder → File System (write to file, create backup)
7. ModelManipulator → MCP Tools (return confirmation)
8. MCP Tools → MCP Server (format as markdown)
9. MCP Server → MCP Client (JSON-RPC response)
```

## Design Decisions

### 1. In-Memory Model Manipulation

**Decision:** All CRUD operations modify the model in memory. Changes are persisted only when `SaveModel` is called.

**Rationale:**
- Better performance (no file I/O on every operation)
- Atomic operations (all changes saved together)
- Transaction support (rollback on errors)
- User control over when to persist

### 2. Caching Strategy

**Decision:** ModelLoader caches parsed model data and invalidates on file changes.

**Rationale:**
- Performance optimization (avoid re-parsing on every read)
- File watching for automatic cache invalidation
- Memory-efficient (single cache instance)

### 3. Error Handling

**Decision:** Comprehensive error handling with error codes, suggestions, and context.

**Rationale:**
- Better user experience (actionable error messages)
- Easier debugging (detailed context)
- Consistent error format across all operations

### 4. Validation Strategy

**Decision:** Multi-layer validation (XSD, business rules, referential integrity).

**Rationale:**
- Ensures model correctness
- Catches errors early
- Maintains ArchiMate specification compliance

### 5. Performance Targets

**Decision:** Defined performance targets for all operations.

**Rationale:**
- Ensures responsive user experience
- Provides benchmarks for optimization
- Sets clear expectations

## Security Considerations

### File System Access

- Server has read/write access to model files
- Backup files created before saves
- File path validation to prevent directory traversal

### Input Validation

- All inputs validated before processing
- XSD validation ensures XML structure correctness
- Business rules validation ensures semantic correctness

### Error Information

- Error messages don't expose sensitive file system paths
- Detailed errors only in development mode
- Sanitized error responses for production

## Performance Characteristics

### Read Operations
- **Target:** < 100ms
- **Typical:** 10-50ms for models with < 1000 elements
- **Optimization:** In-memory access, caching

### Write Operations
- **Target:** < 500ms
- **Typical:** 50-200ms for single operations
- **Optimization:** In-memory manipulation, deferred validation

### Validation Operations
- **Target:** < 1s
- **Typical:** 200-800ms for models with < 1000 elements
- **Optimization:** Cached validation results (future)

### Save Operations
- **Target:** < 2s
- **Typical:** 500ms-1.5s for typical models
- **Optimization:** Efficient XML serialization

## Extension Points

### Custom Validators

Add custom validation by extending `BusinessRulesValidator`:
```typescript
class CustomValidator extends BusinessRulesValidator {
  validateCustomRule(...) {
    // Custom validation logic
  }
}
```

### Custom Error Handling

Extend error handling by adding error codes to `error-codes.ts`:
```typescript
export const ERROR_CODES = {
  CUSTOM_ERROR: {
    code: 'CUSTOM_ERROR',
    message: 'Custom error message',
    suggestions: ['Suggestion 1', 'Suggestion 2']
  }
};
```

### Custom Tools

Add custom MCP tools in `tools.ts`:
```typescript
{
  name: 'CustomTool',
  description: 'Custom tool description',
  inputSchema: { ... },
  handler: async (params) => {
    // Tool implementation
  }
}
```

## Testing Strategy

### Unit Tests
- Test individual components in isolation
- Mock dependencies
- Test error cases

### Integration Tests
- Test component interactions
- Test with real model files
- Test error propagation

### Performance Tests
- Benchmark all operations
- Verify performance targets
- Profile bottlenecks

### End-to-End Tests
- Test complete workflows
- Test with real ArchiMate models
- Verify Archi compatibility

## Future Enhancements

### Potential Improvements

1. **Validation Caching**
   - Cache validation results to improve performance
   - Invalidate cache on model changes

2. **Incremental Save**
   - Save only changed parts of model
   - Reduce save time for large models

3. **Batch Operations**
   - Support batch create/update/delete
   - Improve performance for bulk operations

4. **Model Diff**
   - Track changes between saves
   - Generate change reports

5. **Query Language**
   - Support query language for complex searches
   - Filter and sort operations
