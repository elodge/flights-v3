# Testing Guide - Daysheets Flight Management System

## 🧪 Testing Stack

- **[Vitest](https://vitest.dev/)** - Fast unit testing framework (Vite-native)
- **[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)** - Simple and complete testing utilities
- **[jsdom](https://github.com/jsdom/jsdom)** - DOM implementation for testing
- **[@testing-library/jest-dom](https://github.com/testing-library/jest-dom)** - Custom Jest matchers
- **[@testing-library/user-event](https://testing-library.com/docs/user-event/intro/)** - Advanced user interaction simulation

## 🚀 Quick Start

### Running Tests

```bash
# Run tests in watch mode (development)
npm run test

# Run tests once and exit
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (browser interface)
npm run test:ui

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

The current setup includes comprehensive coverage reporting with these thresholds:
- **Branches**: 80%
- **Functions**: 80% 
- **Lines**: 80%
- **Statements**: 80%

Coverage reports are generated in multiple formats:
- **Terminal**: Text output during test runs
- **HTML**: Interactive browser report in `./coverage/index.html`
- **LCOV**: For CI/CD integration

## 📁 Test Organization

```
src/test/                    # Test configuration & utilities
├── setup.ts                 # Global test setup & mocks
├── utils.tsx               # Custom testing utilities & mock data
└── types.d.ts              # TypeScript definitions for tests

__tests__/                  # Test files (anywhere in project)
├── lib/__tests__/
│   ├── utils.test.ts
│   └── supabase.test.ts
├── components/__tests__/
│   └── header.test.tsx
├── components/ui/__tests__/
│   └── button.test.tsx
└── app/__tests__/
    └── page.test.tsx
```

## 🛠️ Configuration

### Vitest Config (`vitest.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      thresholds: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } }
    }
  }
})
```

### Global Setup (`src/test/setup.ts`)

Automatically configured for all tests:
- **Next.js mocks** (router, Link, Image components)
- **jsdom enhancements** (matchMedia, ResizeObserver)
- **Environment variables** for testing
- **Cleanup** after each test

## 🧰 Testing Utilities

### Custom Render Function

```typescript
import { renderWithProviders } from '@/src/test/utils'

// Renders components with all necessary providers
renderWithProviders(<MyComponent />)
```

### Mock Data Factories

Pre-built mock data for all database entities:

```typescript
import { mockUser, mockArtist, mockProject, mockLeg } from '@/src/test/utils'

// Use in tests
const testUser = { ...mockUser, email: 'custom@test.com' }
```

### Supabase Mocking

```typescript
import { mockSupabaseClient, createMockResponse } from '@/src/test/utils'

// Mock successful response
mockSupabaseClient.from().select.mockResolvedValue(
  createMockResponse([{ id: '1', name: 'Test' }])
)
```

## ✅ Test Patterns

### Component Testing

```typescript
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/src/test/utils'

describe('MyComponent', () => {
  it('handles user interaction', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyComponent />)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

### API/Database Testing

```typescript
import { mockSupabaseClient } from '@/src/test/utils'

describe('Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches artists successfully', async () => {
    const mockArtists = [{ id: '1', name: 'Test Artist' }]
    mockSupabaseClient.from().select.mockResolvedValue({ 
      data: mockArtists, 
      error: null 
    })

    // Test your function that uses Supabase
  })
})
```

### Form Testing

```typescript
import { renderWithProviders } from '@/src/test/utils'
import userEvent from '@testing-library/user-event'

describe('ContactForm', () => {
  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactForm />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })
})
```

## 🔧 Mocking Strategies

### Next.js Components

Automatically mocked in `setup.ts`:
- `next/navigation` (useRouter, usePathname, useSearchParams)
- `next/link` (Link component)
- `next/image` (Image component)

### External Libraries

```typescript
// Mock a library
vi.mock('some-library', () => ({
  default: vi.fn(() => 'mocked-result'),
  namedExport: vi.fn()
}))
```

### Environment Variables

```typescript
beforeAll(() => {
  process.env.CUSTOM_VAR = 'test-value'
})
```

### Browser APIs

```typescript
// Already configured in setup.ts
window.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}))
```

## 📊 Current Test Status

### ✅ Working Tests (29 passing)
- **Utility functions** (lib/utils.test.ts)
- **Core component rendering** 
- **Basic user interactions**
- **Environment setup**
- **Mock configurations**

### 🔧 Test Adjustments Needed (7 failing)
Minor assertion adjustments for:
- Button component class expectations 
- Header accessibility labels
- Page structure assertions
- SVG icon detection

## 🎯 Best Practices

### 1. Test Behavior, Not Implementation
```typescript
// ❌ Bad - testing implementation
expect(mockFunction).toHaveBeenCalledWith(specific, args)

// ✅ Good - testing behavior
expect(screen.getByText('Success message')).toBeInTheDocument()
```

### 2. Use Accessible Queries
```typescript
// ✅ Prefer these queries (in order of priority)
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email address/i)
screen.getByPlaceholderText(/enter email/i)
screen.getByText(/welcome/i)

// ⚠️ Use sparingly
screen.getByTestId('submit-button')
```

### 3. Async Testing
```typescript
// ✅ For user interactions
await user.click(button)

// ✅ For async state changes
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

### 4. Mock External Dependencies
```typescript
// ✅ Mock at module level
vi.mock('@/lib/api', () => ({
  fetchUser: vi.fn()
}))
```

## 🚦 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## 🔍 Debugging Tests

### 1. Debug Rendering
```typescript
import { screen } from '@testing-library/react'

// See what's rendered
screen.debug()

// See specific element
screen.debug(screen.getByRole('button'))
```

### 2. Check Available Roles
```typescript
// When a query fails, see all available roles
screen.getByRole('nonexistent') // Error shows all available roles
```

### 3. Vitest UI
```bash
npm run test:ui
```
Opens browser interface for interactive test debugging.

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [jsdom Documentation](https://github.com/jsdom/jsdom)

## 🔄 Next Steps

1. **Fix failing test assertions** for complete green suite
2. **Add integration tests** for complex user flows
3. **Set up visual regression testing** (optional)
4. **Configure performance testing** (optional)
5. **Add E2E tests** with Playwright/Cypress (separate setup)

The testing foundation is solid and ready for comprehensive test development! 🎉
