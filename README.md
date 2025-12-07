# Enlace

> **Enlace** (Spanish: /enˈla.se/) — *link, connection, bond*

A type-safe API client for React and Next.js with built-in caching and automatic revalidation.

## Features

- **Type-Safe** — Full TypeScript support with schema-driven API clients
- **Proxy-Based API** — Fluent interface: `api.users[id].posts.get()`
- **React Hooks** — SWR-style caching with automatic dependency tracking
- **Next.js Integration** — ISR, cache tags, and server-side revalidation

## Packages

| Package | Description |
|---------|-------------|
| [`enlace-core`](./packages/core) | Core fetch wrapper and type-safe API client |
| [`enlace`](./packages/enlace) | React hooks and Next.js integration |

## Quick Start

```bash
# For React projects
npm install enlace

# For vanilla JS/TS (no React)
npm install enlace-core
```

### Basic Usage

```typescript
import { createEnlaceHook } from "enlace";

// Define your API schema
type ApiSchema = {
  posts: {
    $get: Endpoint<Post[], ApiError>;
    $post: Endpoint<Post, ApiError, CreatePost>;
    _: {
      $get: Endpoint<Post, ApiError>;
      $delete: Endpoint<void, ApiError>;
    };
  };
};

// Create a hook
const useAPI = createEnlaceHook<ApiSchema>("https://api.example.com");

// Use in components
function Posts() {
  const { data, loading, error } = useAPI((api) => api.posts.get());

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <ul>{data.map((post) => <li key={post.id}>{post.title}</li>)}</ul>;
}
```

### Automatic Cache Tags

**Tags are automatically generated from URL paths** — no manual configuration needed:

```typescript
// GET /posts → tags: ['posts']
// GET /posts/123 → tags: ['posts', 'posts/123']
// POST /posts → auto-revalidates 'posts' tag

// Queries automatically use generated tags for caching
const { data } = useAPI((api) => api.posts[123].get());

// Mutations automatically revalidate matching tags
const { trigger } = useAPI((api) => api.posts.post);
trigger({ body: { title: "New" } }); // Auto-revalidates 'posts'
```

### Next.js with Server Revalidation

```typescript
// actions.ts
"use server";

import { revalidateTag } from "next/cache";

export async function revalidateAction(tags: string[]) {
  for (const tag of tags) {
    revalidateTag(tag);
  }
}
```

```typescript
// useAPI.ts
import { createEnlaceHook } from "enlace/next/hook";
import { revalidateAction } from "./actions";

const useAPI = createEnlaceHook<ApiSchema>("https://api.example.com", {}, {
  revalidator: revalidateAction,
});
```

## Documentation

- [enlace-core](./packages/core/README.md) — Core API client documentation
- [enlace](./packages/enlace/README.md) — React hooks and Next.js documentation

## License

MIT
