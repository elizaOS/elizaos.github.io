# Commands for ElizaOS Contributor Analytics

## Build & Development
- `bun run dev` - Start development server
- `bun run build` - Build production site
- `bun run check` - Run linter and type checks
- `bun run lint` - Run ESLint only
- `bunx tsc --noEmit` - Run TypeScript checks
- `bun run serve` - Serve built site
- `bun run init-db` - Initialize database
- `bun run db:generate` - Generate database schema

## Code Style
- Next.js 15 app router with Typescript and Tailwind CSS
- Import order: React, libraries, local components (@/components), utils
- Component names: PascalCase, file names: kebab-case
- Use TypeScript for all files
- Use React hooks and functional components
- Strict error handling with TypeScript's strict mode
- Use shadcn/ui component library
- SQLite database with Drizzle ORM
- Follow modern Next.js patterns with server components where appropriate