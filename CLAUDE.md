# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
npm run dev:daemon   # Start dev server in background, logs to logs.txt
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all tests (Vitest)
npm run setup        # Install deps + generate Prisma client + run migrations
npm run db:reset     # Reset and re-run all migrations (destructive)
```

To run a single test file:
```bash
npx vitest src/lib/__tests__/file-system.test.ts
```

Dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` (already set in npm scripts). Always use the npm scripts rather than calling `next` directly.

## Environment

Copy `.env` and set:
- `ANTHROPIC_API_KEY` — if absent, a `MockLanguageModel` is used instead, returning static placeholder components
- `JWT_SECRET` — defaults to `"development-secret-key"` if unset

## Architecture

### Request flow

1. User types a prompt in **ChatInterface** → sent via Vercel AI SDK's `useChat` to `POST /api/chat`
2. The API route reconstructs a `VirtualFileSystem` from the serialized `files` in the request body, then calls `streamText` with two tools: `str_replace_editor` and `file_manager`
3. Claude calls these tools to create/edit files in the VFS
4. Tool calls are streamed back to the client; `onToolCall` in `ChatContext` dispatches them to `FileSystemContext.handleToolCall`, which mutates the in-memory VFS and triggers a React re-render
5. `PreviewFrame` reads the updated VFS, transpiles all JS/JSX/TS/TSX files via **Babel standalone**, builds a browser-native import map with blob URLs, and renders the result in an `<iframe>`

### Virtual File System (`src/lib/file-system.ts`)

`VirtualFileSystem` is an in-memory tree of `FileNode` objects (no disk I/O). It is serialized to a plain `Record<string, FileNode>` for JSON transport and Prisma storage. The preview always renders from `/App.jsx` as the entry point if it exists.

### AI tools (`src/lib/tools/`)

- `str_replace_editor` — supports `create`, `str_replace`, `view`, and `insert` commands on the VFS
- `file_manager` — supports `rename` and `delete`

### Preview pipeline (`src/lib/transform/jsx-transformer.ts`)

`createImportMap` transforms all VFS files with Babel, creates blob URLs, and builds an ES module import map. Third-party imports are resolved via `https://esm.sh/`. The resulting HTML (with Tailwind CDN included) is written into the iframe via `srcdoc`.

### Contexts

- `FileSystemProvider` — owns the singleton `VirtualFileSystem` instance; exposes CRUD operations and `handleToolCall`
- `ChatProvider` — wraps Vercel AI SDK's `useChat`; wires `onToolCall` to `FileSystemContext.handleToolCall` and serializes the VFS into every request body

### Auth (`src/lib/auth.ts`)

JWT-based, stored in an httpOnly cookie (`auth-token`). Uses `jose` for signing/verification. Passwords hashed with `bcrypt`. Auth is optional — anonymous users can use the app without logging in; their work is tracked via `anon-work-tracker.ts` in localStorage.

### Data persistence (`prisma/schema.prisma`)

SQLite (file `prisma/dev.db`). Two models: `User` and `Project`. Projects store `messages` and VFS `data` as JSON strings. Only authenticated users have projects saved server-side.

### Routing

- `/` — redirects authenticated users to their most recent project; shows anonymous UI otherwise
- `/[projectId]` — loads saved project (messages + VFS data) and renders `MainContent`

## Testing

Tests use Vitest + jsdom + React Testing Library. Test files live in `__tests__/` subdirectories next to the code they test.

## Key implementation details

### AI model

The model is configured in `src/lib/provider.ts` as `claude-haiku-4-5`. Change the `MODEL` constant there to use a different model.

### Generated code conventions (system prompt)

The AI follows rules defined in `src/lib/prompts/generation.tsx`:
- Every project must have `/App.jsx` as its root entry point
- Non-library imports use `@/` alias (e.g., `import Foo from '@/components/Foo'`)
- Styling uses Tailwind CSS only, no hardcoded styles
- No HTML files — `App.jsx` is the sole entrypoint

The `@/` alias in **generated VFS code** resolves to the VFS root `/`, handled by the import-map transformer. This is separate from Next.js's `@/` alias (which resolves to `src/`).

### Context provider nesting

`ChatProvider` depends on `FileSystemContext` and must be nested inside `FileSystemProvider`. Both are composed together in `MainContent`.

### Protected routes

Only `/api/projects` and `/api/filesystem` require authentication (enforced by `src/middleware.ts`). The `/api/chat` route is open to anonymous users.

### Anonymous work tracking

When an unauthenticated user makes edits, `src/lib/anon-work-tracker.ts` persists messages and VFS state to `localStorage` so work survives page refreshes.
