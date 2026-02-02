# Contributing to Chapter

Thank you for your interest in contributing to Chapter! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for Redis)
- Git

### Getting Started

1. Fork and clone the repository:
```bash
git clone https://github.com/your-username/chapter.git
cd chapter
```

2. Run the development setup script:
```bash
./scripts/dev-setup.sh
```

This will:
- Install dependencies
- Create environment files
- Start Redis via Docker
- Set up the SQLite database

3. Start development servers:
```bash
pnpm dev
```

Access the app at http://localhost:3000

## Project Structure

```
chapter/
├── apps/
│   ├── server/     # Fastify backend API
│   └── web/        # Next.js frontend
├── packages/
│   ├── types/      # Shared TypeScript types
│   ├── utils/      # Shared utilities
│   └── epub-parser/# EPUB parsing logic
├── docker/         # Docker configuration
└── scripts/        # Setup scripts
```

## Code Style

We use Prettier for code formatting. Format your code before committing:

```bash
pnpm format
```

### TypeScript

- Use strict TypeScript
- Avoid `any` types
- Export types from `@chapter/types` package
- Use interfaces for object shapes

### Naming Conventions

- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

## Git Workflow

### Branching

- `main` - production-ready code
- `develop` - development branch
- `feature/*` - new features
- `fix/*` - bug fixes
- `docs/*` - documentation

### Commit Messages

We follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

Examples:
```
feat(books): add EPUB upload functionality
fix(auth): correct JWT expiration handling
docs(readme): update installation instructions
```

### Pull Requests

1. Create a feature branch from `develop`
2. Make your changes
3. Write or update tests
4. Format code with `pnpm format`
5. Commit with conventional commit messages
6. Push and create a PR to `develop`
7. Wait for review

PR Title Format:
```
feat: Add feature description
fix: Fix bug description
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd apps/server
pnpm test
```

### Writing Tests

- Place tests next to source files with `.test.ts` extension
- Use descriptive test names
- Cover edge cases
- Mock external dependencies

Example:
```typescript
describe('tokenizer', () => {
  it('should tokenize text into words and punctuation', () => {
    const tokens = tokenize('Hello, world!');
    expect(tokens).toHaveLength(4);
  });
});
```

## Database Changes

### Creating Migrations

1. Update `apps/server/prisma/schema.prisma`
2. Create migration:
```bash
cd apps/server
pnpm db:migrate
```
3. Name your migration descriptively
4. Commit both schema and migration files

### Schema Guidelines

- Use descriptive field names
- Add indexes for frequently queried fields
- Document complex fields with comments
- Use appropriate field types

## API Development

### Adding Endpoints

1. Create service in appropriate module
2. Add route handler
3. Register route in `app.ts`
4. Document endpoint in README
5. Add authentication if needed

Example:
```typescript
// books.service.ts
export class BooksService {
  async getBook(id: string) {
    return prisma.book.findUnique({ where: { id } });
  }
}

// books.routes.ts
export const booksRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const book = await booksService.getBook(id);
    return reply.send(book);
  });
};
```

### Error Handling

- Return appropriate HTTP status codes
- Include descriptive error messages
- Log errors server-side
- Don't expose sensitive information

## Frontend Development

### Component Guidelines

- Use functional components
- Extract reusable components
- Keep components focused and small
- Use TypeScript props interfaces

Example:
```typescript
interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
}

export function BookCard({ book, onSelect }: BookCardProps) {
  return (
    <div onClick={() => onSelect(book)}>
      <h3>{book.title}</h3>
      <p>{book.author}</p>
    </div>
  );
}
```

### State Management

- Use Zustand for global state
- Use TanStack Query for API calls
- Keep local state in components when possible

### Styling

- Use Tailwind CSS classes
- Follow shadcn/ui patterns
- Keep responsive design in mind
- Support dark mode

## Documentation

### Code Documentation

- Document complex logic with comments
- Use JSDoc for public APIs
- Keep comments up to date

### README Updates

- Update README for new features
- Keep API documentation current
- Add examples for complex features

## Performance

### Backend

- Use database indexes
- Implement caching where appropriate
- Avoid N+1 queries
- Stream large responses

### Frontend

- Lazy load components
- Optimize images
- Minimize bundle size
- Use React.memo for expensive components

## Security

### Guidelines

- Never commit secrets
- Validate all user input
- Use parameterized queries (Prisma handles this)
- Implement rate limiting for sensitive endpoints
- Follow OWASP guidelines

### Authentication

- Always verify JWT tokens on protected routes
- Hash passwords with bcrypt
- Use secure JWT secrets
- Implement proper session management

## Release Process

1. Merge features to `develop`
2. Test thoroughly
3. Update version in `package.json`
4. Update CHANGELOG.md
5. Create release branch
6. Merge to `main`
7. Tag release
8. Deploy

## Getting Help

- Check existing issues and PRs
- Read the documentation
- Ask in discussions
- Join our community chat (coming soon)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Follow the project's code of conduct

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue or start a discussion!
