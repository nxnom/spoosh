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
| [`enlace-openapi`](./packages/openapi) | Generate OpenAPI specs from TypeScript schema |

## Quick Start

```bash
# For React projects
npm install enlace

# For vanilla JS/TS (no React)
npm install enlace-core
```

### Basic Usage

```typescript
import { enlaceHookReact } from "enlace/hook";
import { Endpoint } from "enlace";

// Define your API error type
type ApiError = { message: string; code: number };

// Define your API schema (simplified syntax!)
type ApiSchema = {
  posts: {
    $get: Post[];                                   // Simple: just data type
    $post: Endpoint<Post, CreatePost>;              // Data + Body
    $put: Endpoint<Post, UpdatePost, CustomError>;  // Data + Body + Custom Error
    _: {
      $get: Post;                                   // Simple: just data type
      $delete: void;                                // void response
    };
  };
};

// Create a hook with global error type
const useAPI = enlaceHookReact<ApiSchema, ApiError>("https://api.example.com");

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
import { enlaceHookNext } from "enlace/hook";
import { revalidateAction } from "./actions";

const useAPI = enlaceHookNext<ApiSchema, ApiError>("https://api.example.com", {}, {
  serverRevalidator: revalidateAction,
});
```

## Documentation

- [enlace-core](./packages/core/README.md) — Core API client documentation
- [enlace](./packages/enlace/README.md) — React hooks and Next.js documentation
- [enlace-openapi](./packages/openapi/README.md) — OpenAPI generator documentation

## License

MIT
