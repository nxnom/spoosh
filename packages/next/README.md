# enlace-next

Type-safe API client with React hooks for Next.js, featuring server-side revalidation and caching support.

## Installation

```bash
npm install enlace-next
```

## Quick Start

### Server Components

Use `enlace` for server components (server-safe):

```typescript
import { enlace } from "enlace-next";

type ApiError = { message: string };

const api = enlace<ApiSchema, ApiError>("https://api.example.com", {}, {
  autoGenerateTags: true,
});

export default async function Page() {
  const { data } = await api.posts.$get({
    revalidate: 60, // ISR: revalidate every 60 seconds
  });

  return <PostList posts={data} />;
}
```

### Client Components

Use `enlaceHooks` from `enlace-next/client` for client components:

```typescript
"use client";

import { enlaceHooks } from "enlace-next/client";
import { revalidateAction } from "./actions";

type ApiError = { message: string };

export const { useRead, useWrite, useInfiniteRead } = enlaceHooks<
  ApiSchema,
  ApiError
>("https://api.example.com", {}, { serverRevalidator: revalidateAction });
```

### Server-Side Revalidation

Create a server action to trigger Next.js cache revalidation:

```typescript
// actions.ts
"use server";

import { revalidateTag, revalidatePath } from "next/cache";

export async function revalidateAction(tags: string[], paths: string[]) {
  for (const tag of tags) {
    revalidateTag(tag);
  }
  for (const path of paths) {
    revalidatePath(path);
  }
}
```

**In components:**

```typescript
function CreatePost() {
  const { trigger } = useWrite((api) => api.posts.$post);

  const handleCreate = () => {
    trigger({
      body: { title: "New Post" },
      revalidateTags: ["posts"], // Passed to serverRevalidator
      revalidatePaths: ["/posts"], // Passed to serverRevalidator
    });
  };
}
```

## Features

### Automatic Cache Tags

Tags are automatically generated from URL paths:

```typescript
// GET /posts       → tags: ['posts']
// GET /posts/123   → tags: ['posts', 'posts/123']
// GET /users/5/posts → tags: ['users', 'users/5', 'users/5/posts']
```

### ISR (Incremental Static Regeneration)

```typescript
const { data } = await api.posts.$get({
  revalidate: 60, // Revalidate every 60 seconds
});

// Or never revalidate (static)
const { data } = await api.posts.$get({
  revalidate: false,
});
```

### CSR-Heavy Projects

For projects that primarily use client-side rendering, disable server-side revalidation by default:

```typescript
export const { useRead, useWrite } = enlaceHooks<ApiSchema, ApiError>(
  "/api",
  {},
  {
    serverRevalidator: revalidateAction,
    skipServerRevalidation: true, // Disable server revalidation by default
  }
);

// Mutations won't trigger server revalidation by default
await trigger({ body: { title: "New Post" } });

// Opt-in to server revalidation when needed
await trigger({ body: { title: "New Post" }, serverRevalidate: true });
```

### Per-Request Server Revalidation Control

Override the global setting for individual requests:

```typescript
// Skip server revalidation for this request
await trigger({ body: data, serverRevalidate: false });

// Force server revalidation for this request
await trigger({ body: data, serverRevalidate: true });
```

## Request Options

### Server Component Options

```typescript
api.posts.$get({
  tags: ["posts"], // Custom cache tags (replaces auto-generated)
  revalidate: 60, // ISR revalidation (seconds) or false for static
});
```

### Client Component Options

```typescript
trigger({
  body: { title: "New" },
  revalidateTags: ["posts"], // Tags to invalidate after mutation
  revalidatePaths: ["/"], // Paths to revalidate after mutation
  serverRevalidate: true, // Control server-side revalidation
});
```

## API Reference

### `enlace<TSchema, TDefaultError>(baseUrl, options?, nextOptions?)`

Creates a Next.js typed API client with caching support. Server-safe.

**Parameters:**

- `baseUrl` — Base URL for requests
- `options` — Default fetch options (headers, cache, etc.)
- `nextOptions` — Next.js specific options

**Next.js Options:**

```typescript
type NextOptions = {
  autoGenerateTags?: boolean; // default: true
  autoRevalidateTags?: boolean; // default: true
  serverRevalidator?: (tags: string[], paths: string[]) => void | Promise<void>;
  skipServerRevalidation?: boolean; // default: false
};
```

### `enlaceHooks<TSchema, TDefaultError>(baseUrl, options?, hookOptions?)`

Creates React hooks for client components. Returns `{ useRead, useWrite, useInfiniteRead }`.

**Hook Options:**

```typescript
type NextHookOptions = {
  autoGenerateTags?: boolean; // default: true
  autoRevalidateTags?: boolean; // default: true
  staleTime?: number; // default: 0
  serverRevalidator?: (tags: string[], paths: string[]) => void | Promise<void>;
  skipServerRevalidation?: boolean; // default: false
  onSuccess?: (payload) => void;
  onError?: (payload) => void;
};
```

## Utilities

### `invalidateTags`

Manually invalidate client-side cache:

```typescript
import { invalidateTags } from "enlace-next/client";

invalidateTags(["posts"]);
```

## Comparison with `enlace`

| Feature             | `enlace` | `enlace-next` |
| ------------------- | -------- | ------------- |
| React hooks         | ✅       | ✅            |
| Server components   | ❌       | ✅            |
| ISR support         | ❌       | ✅            |
| Server revalidation | ❌       | ✅            |
| Next.js cache tags  | ❌       | ✅            |

## License

MIT
