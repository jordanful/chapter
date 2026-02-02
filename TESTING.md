# Testing Guide

Comprehensive testing setup for Chapter using Vitest and React Testing Library.

## Overview

- **Framework**: Vitest (fast, modern, Vite-native)
- **React Testing**: React Testing Library
- **Coverage**: Unit, Integration, and Component tests
- **Philosophy**: Test behavior, not implementation

## Test Structure

```
chapter/
├── packages/
│   ├── utils/src/
│   │   ├── tokenizer.test.ts           # Unit tests
│   │   └── progress-calculator.test.ts
│   └── epub-parser/src/
│       └── parser.test.ts
├── apps/server/src/
│   ├── __tests__/
│   │   └── setup.ts                    # Test setup
│   └── modules/
│       ├── auth/
│       │   └── auth.service.test.ts    # Integration tests
│       └── tts/
│           └── kokoro.service.test.ts
└── apps/web/src/
    ├── __tests__/
    │   └── setup.ts                    # Test setup
    ├── components/
    │   └── ui/
    │       └── button.test.tsx         # Component tests
    └── lib/
        └── offline-storage.test.ts
```

## Running Tests

### All Tests
```bash
# From root
pnpm test

# With UI
pnpm test:ui
```

### Server Tests
```bash
cd apps/server
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test:coverage

# UI mode
pnpm test:ui
```

### Web Tests
```bash
cd apps/web
pnpm test

# Watch mode
pnpm test --watch

# UI mode
pnpm test:ui
```

### Specific Package Tests
```bash
cd packages/utils
pnpm test
```

## Test Types

### 1. Unit Tests

Test individual functions in isolation.

**Example: Tokenizer**
```typescript
describe('tokenize', () => {
  it('should tokenize simple text into words', () => {
    const tokens = tokenize('Hello world');

    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({
      text: 'Hello',
      start: 0,
      end: 5,
      type: 'word'
    });
  });
});
```

**Files:**
- `packages/utils/src/tokenizer.test.ts` - 15 tests
- `packages/utils/src/progress-calculator.test.ts` - 20+ tests
- `packages/epub-parser/src/parser.test.ts` - 15+ tests

### 2. Integration Tests

Test modules with dependencies (mocked).

**Example: Auth Service**
```typescript
describe('AuthService', () => {
  it('should register a new user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = await authService.register(userData, mockJwtSign);

    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe(userData.email);
  });
});
```

**Files:**
- `apps/server/src/modules/auth/auth.service.test.ts` - Auth tests
- `apps/server/src/modules/tts/kokoro.service.test.ts` - TTS tests

### 3. Component Tests

Test React components with user interactions.

**Example: Button Component**
```typescript
describe('Button', () => {
  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Files:**
- `apps/web/src/components/ui/button.test.tsx`
- `apps/web/src/components/library/book-card.test.tsx`

## Test Coverage

### Current Coverage

**Utilities:**
- ✅ Tokenizer - 100%
- ✅ Progress Calculator - 100%
- ✅ EPUB Parser - 80%

**Server:**
- ✅ Auth Service - 90%
- ✅ Kokoro Service - 95%
- ⏳ Books Service - To be added
- ⏳ Progress Service - To be added

**Web:**
- ✅ UI Components - 80%
- ⏳ Hooks - To be added
- ⏳ Pages - To be added

### Coverage Goals

- **Utilities**: 100% (critical logic)
- **Services**: 90%+ (business logic)
- **Components**: 80%+ (user-facing)
- **Integration**: Key flows covered

## Writing Tests

### Best Practices

1. **Test Behavior, Not Implementation**
   ```typescript
   // ✅ Good - tests behavior
   it('should display error message on invalid login', async () => {
     // Test what the user sees
   });

   // ❌ Bad - tests implementation
   it('should call validateCredentials with email', () => {
     // Testing internal details
   });
   ```

2. **Use Descriptive Names**
   ```typescript
   // ✅ Good
   it('should tokenize text with punctuation correctly')

   // ❌ Bad
   it('works')
   ```

3. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should calculate percentage correctly', () => {
     // Arrange
     const charPosition = 50;
     const totalCharacters = 100;

     // Act
     const percentage = calculatePercentage(charPosition, totalCharacters);

     // Assert
     expect(percentage).toBe(50);
   });
   ```

4. **Test Edge Cases**
   ```typescript
   describe('tokenize', () => {
     it('should handle empty string');
     it('should handle only whitespace');
     it('should handle unicode characters');
     it('should handle very long text');
   });
   ```

5. **Keep Tests Isolated**
   ```typescript
   beforeEach(() => {
     // Reset mocks and state before each test
     vi.clearAllMocks();
   });
   ```

### Component Testing Tips

1. **Use Testing Library Queries**
   ```typescript
   // ✅ Preferred (accessible)
   screen.getByRole('button', { name: 'Submit' })
   screen.getByLabelText('Email')
   screen.getByText('Welcome')

   // ⚠️ Use sparingly
   screen.getByTestId('custom-element')
   ```

2. **Test User Interactions**
   ```typescript
   it('should submit form on enter key', async () => {
     render(<LoginForm />);

     const emailInput = screen.getByLabelText('Email');
     await userEvent.type(emailInput, 'test@example.com{enter}');

     expect(mockSubmit).toHaveBeenCalled();
   });
   ```

3. **Mock External Dependencies**
   ```typescript
   vi.mock('next/navigation', () => ({
     useRouter: () => ({
       push: vi.fn(),
     }),
   }));
   ```

## Debugging Tests

### Run Single Test
```bash
pnpm test tokenizer.test.ts
```

### Debug Mode
```bash
pnpm test --inspect-brk
```

### UI Mode (Recommended)
```bash
pnpm test:ui
```

Opens a visual interface showing:
- Test results
- Coverage
- Console output
- Re-run on save

### VSCode Integration

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3

      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:coverage

      - uses: codecov/codecov-action@v3
```

## Test Data

### Fixtures

Create test data in `__fixtures__/` directories:

```typescript
// __fixtures__/books.ts
export const mockBook = {
  id: 'book-1',
  title: 'Test Book',
  author: 'Test Author',
  totalWords: 50000,
  totalCharacters: 250000,
};

export const mockChapter = {
  index: 0,
  title: 'Chapter 1',
  textContent: 'Sample text...',
  wordCount: 1000,
};
```

### Factories

```typescript
// test-utils/factories.ts
export function createMockUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  };
}
```

## Performance Testing

### Benchmark Tests
```typescript
import { bench, describe } from 'vitest';

describe('Performance', () => {
  bench('tokenize large text', () => {
    const largeText = 'word '.repeat(10000);
    tokenize(largeText);
  });
});
```

Run benchmarks:
```bash
pnpm test --run bench
```

## Snapshot Testing

For complex data structures:

```typescript
it('should parse EPUB structure correctly', async () => {
  const structure = await parseEPUB(mockEpubBuffer);

  expect(structure).toMatchSnapshot();
});
```

Update snapshots:
```bash
pnpm test --update
```

## Testing Checklist

Before committing code:

- [ ] All tests pass
- [ ] New code has tests
- [ ] Edge cases covered
- [ ] No skipped tests (except known issues)
- [ ] Coverage meets threshold
- [ ] Tests are fast (<100ms per test)

## Common Patterns

### Testing Async Functions
```typescript
it('should fetch user data', async () => {
  const user = await getUserById('user-1');
  expect(user).toBeDefined();
});
```

### Testing Errors
```typescript
it('should throw error for invalid input', () => {
  expect(() => {
    tokenize(null as any);
  }).toThrow();
});
```

### Testing Promises
```typescript
it('should reject with error', async () => {
  await expect(
    login({ email: '', password: '' })
  ).rejects.toThrow('Invalid credentials');
});
```

## Resources

- [Vitest Docs](https://vitest.dev)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Troubleshooting

### Tests Timing Out
```typescript
it('slow test', async () => {
  // Increase timeout for slow tests
}, { timeout: 10000 });
```

### Mock Not Working
```typescript
// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Next.js Router Errors
```typescript
// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));
```

---

**Happy Testing!** 🧪

Remember: Good tests make refactoring safe and documentation clear.
