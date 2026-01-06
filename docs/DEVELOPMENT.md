# ArchiScribe MCP Server - Development Guide

## Setup

### Prerequisites

- Node.js 18+ or Bun
- TypeScript 5.0+
- npm or bun package manager

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Development Mode

```bash
# Run with auto-restart on file changes
npm run dev
# or
bun run dev
```

### Building

```bash
# Compile TypeScript to JavaScript
npm run build
# or
bun run build
```

### Running Production Build

```bash
# Run compiled server
npm start
# or
bun start
```

## Project Structure

```
archiscribe-mcp/
├── src/
│   ├── mcp/              # MCP server implementation
│   │   ├── index.ts      # Entry point
│   │   ├── server.ts     # MCP server
│   │   └── tools.ts      # MCP tools
│   ├── model/            # Model manipulation
│   │   ├── loader.ts     # Model loading
│   │   ├── manipulator.ts # CRUD operations
│   │   ├── persistence.ts # XML serialization
│   │   ├── types.ts      # Type definitions
│   │   └── manipulator-types.ts # Input/output types
│   ├── utils/            # Utilities
│   │   ├── logger.ts     # Logging
│   │   ├── errors.ts     # Error handling
│   │   ├── error-codes.ts # Error codes
│   │   ├── performance.ts # Performance utilities
│   │   ├── xsd-validator.ts # XSD validation
│   │   ├── business-rules-validator.ts # Business rules
│   │   └── validation-reporter.ts # Validation reports
│   ├── tests/            # Test files
│   └── config/           # Configuration
├── docs/                 # Documentation
├── data/                 # Sample model files
└── package.json
```

## Development Workflow

### 1. Making Changes

1. Make changes to source files in `src/`
2. Tests automatically run in watch mode (if configured)
3. Server auto-restarts in development mode

### 2. Adding New Features

#### Adding a New MCP Tool

1. Add tool definition in `src/mcp/tools.ts`:
```typescript
{
  name: 'NewTool',
  description: 'Tool description',
  inputSchema: {
    type: 'object',
    properties: {
      // Tool parameters
    }
  },
  handler: async (params) => {
    // Tool implementation
  }
}
```

2. Register tool in `src/mcp/server.ts`

3. Add tests in `src/tests/mcp.tools.test.ts`

4. Update documentation in `README.md`

#### Adding a New CRUD Operation

1. Add method to `ModelManipulator` in `src/model/manipulator.ts`
2. Add input/output types in `src/model/manipulator-types.ts`
3. Add validation logic
4. Add error handling with error codes
5. Add tests
6. Update API documentation

### 3. Testing

#### Running Tests

```bash
# Run all tests
npm test
# or
bun test

# Run tests in watch mode
npm test -- --watch
# or
bun test --watch
```

#### Writing Tests

Tests use Vitest. Example:

```typescript
import { describe, it, expect } from 'vitest';
import { ModelManipulator } from '../model/manipulator';

describe('ModelManipulator', () => {
  it('should create element', async () => {
    const manipulator = new ModelManipulator(/* ... */);
    const element = await manipulator.createElement({
      type: 'ApplicationComponent',
      name: 'Test Component'
    });
    expect(element).toBeDefined();
    expect(element.name).toBe('Test Component');
  });
});
```

#### Test Structure

- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test component interactions
- **Performance Tests**: Benchmark operations
- **End-to-End Tests**: Test complete workflows

### 4. Error Handling

#### Adding New Error Codes

1. Add error code definition in `src/utils/error-codes.ts`:
```typescript
export const ERROR_CODES = {
  NEW_ERROR: {
    code: 'NEW_ERROR',
    message: 'Error message',
    suggestions: ['Suggestion 1', 'Suggestion 2'],
    httpStatus: 400
  }
};
```

2. Use error code when throwing errors:
```typescript
import { getErrorCode } from '../utils/error-codes';

const errorDef = getErrorCode('NEW_ERROR');
throw new ValidationError('Error message', validationResult, undefined, errorDef?.suggestions);
```

### 5. Performance Optimization

#### Benchmarking

Use performance utilities to benchmark operations:

```typescript
import { benchmark, PERFORMANCE_TARGETS } from '../utils/performance';

const result = await benchmark(
  'Operation Name',
  async () => {
    // Operation to benchmark
  },
  10, // iterations
  PERFORMANCE_TARGETS.READ_OPERATION // target
);
```

#### Profiling

1. Identify bottlenecks using performance tests
2. Profile with Node.js profiler:
```bash
node --prof dist/mcp/index.js
node --prof-process isolate-*.log
```

3. Optimize critical paths
4. Re-run benchmarks to verify improvements

### 6. Documentation

#### API Documentation

- Update `docs/API.md` when adding new APIs
- Add JSDoc comments to public methods
- Include usage examples

#### Architecture Documentation

- Update `docs/ARCHITECTURE.md` for architectural changes
- Document design decisions
- Update data flow diagrams

#### README

- Update `README.md` for user-facing changes
- Add examples for new features
- Update installation/setup instructions

## Code Style

### TypeScript

- Use strict TypeScript settings
- Prefer interfaces over types for public APIs
- Use explicit return types for public methods
- Avoid `any` type (use `unknown` if necessary)

### Naming Conventions

- **Classes**: PascalCase (e.g., `ModelManipulator`)
- **Functions**: camelCase (e.g., `createElement`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `PERFORMANCE_TARGETS`)
- **Files**: kebab-case (e.g., `model-manipulator.ts`)

### Error Handling

- Always use error codes from `error-codes.ts`
- Include suggestions in error messages
- Provide context in error objects
- Log errors with appropriate level

### Testing

- Write tests for all public APIs
- Test error cases
- Test edge cases
- Aim for > 80% code coverage

## Debugging

### Logging

Logs are written to `logs/archiscribe-YYYY-MM-DD.log`:

```typescript
import { getLogger } from './utils/logger';

const logger = getLogger();
logger.log('info', 'event.name', { key: 'value' });
```

### Debug Mode

Set log level to debug:

```typescript
logger.setLevel('debug');
```

### Common Issues

#### Model Not Loading

- Check file path is correct
- Verify XML is well-formed
- Check file permissions

#### Validation Failures

- Review validation errors
- Check ArchiMate specification
- Verify element/relationship types

#### Performance Issues

- Run performance benchmarks
- Profile with Node.js profiler
- Check for unnecessary operations

## Contributing

### Pull Request Process

1. Create feature branch
2. Make changes
3. Add tests
4. Update documentation
5. Run tests and linting
6. Submit pull request

### Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `perf:` Performance improvements

### Code Review

- All code must be reviewed
- Tests must pass
- Documentation must be updated
- Performance must meet targets

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Run performance benchmarks
5. Build production bundle
6. Tag release
7. Publish (if applicable)
