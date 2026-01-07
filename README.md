# Enlace

> **Enlace** (Spanish: /enˈla.se/) — _link, connection, bond_

The missing link between your API schema and your UI.

## Philosophy

APIs are structured. Your code should reflect that structure.

Enlace takes a different approach to data fetching. Instead of treating API calls as disconnected fetch operations, Enlace models your entire API as a navigable type-safe object. Your API paths become your code paths.

```typescript
// Your API structure IS your code structure
api.users[userId].posts.$get();
api.teams[teamId].members[memberId].$delete();
```

No route strings. No path templates. No runtime typos. Just types, all the way down.

## Core Ideas

**Schema-First** — Define your API shape once. TypeScript infers the rest.

**Proxy Navigation** — Navigate your API like a file system. Paths are validated at compile time.

**Zero Configuration Caching** — Cache tags are derived from URL structure automatically. `GET /posts/123` caches under `['posts', 'posts/123']`. Mutations to `/posts` invalidate what they should.

**Framework Native** — First-class React hooks. Native Next.js cache integration with ISR and server revalidation.

## Packages

| Package                                | Description                                   |
| -------------------------------------- | --------------------------------------------- |
| [`enlace-core`](./packages/core)       | Core fetch wrapper and type-safe API client   |
| [`enlace`](./packages/enlace)          | React hooks for data fetching                 |
| [`enlace-next`](./packages/next)       | Next.js integration with server revalidation  |
| [`enlace-openapi`](./packages/openapi) | Generate OpenAPI specs from TypeScript schema |
| [`enlace-hono`](./packages/hono)       | Type adapter for Hono framework               |

## Installation

```bash
# For React projects
npm install enlace

# For Next.js projects
npm install enlace-next

# For vanilla JS/TS (no React)
npm install enlace-core
```

## Usage

### Define Your Schema

```typescript
import { Endpoint } from "enlace";

type ApiError = { message: string; code: number };

type ApiSchema = {
  posts: {
    $get: Post[]; // GET /posts → Post[]
    $post: Endpoint<Post, CreatePost>; // POST /posts
    _: {
      $get: Post; // GET /posts/:id → Post
      $put: Endpoint<Post, UpdatePost>; // PUT /posts/:id
      $delete: void; // DELETE /posts/:id
    };
  };
  users: {
    _: {
      $get: User;
      posts: {
        $get: Post[]; // GET /users/:id/posts
      };
    };
  };
};
```

### Create Your Hook

```typescript
import { enlaceHooks } from "enlace/hook";

const { useRead, useWrite } = enlaceHooks<ApiSchema, ApiError>(
  "https://api.example.com"
);
```

### Read Data

```typescript
function PostList() {
  const { data, loading, error } = useRead((api) => api.posts.$get());

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <ul>
      {data.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Write Data

```typescript
function CreatePost() {
  const { trigger, loading } = useWrite((api) => api.posts.$post);

  const handleSubmit = async (title: string) => {
    await trigger({ body: { title } });
    // Cache for 'posts' is automatically invalidated
  };

  return <button onClick={() => handleSubmit("New Post")} disabled={loading}>Create</button>;
}
```

### Dynamic Routes

```typescript
function UserPosts({ userId }: { userId: string }) {
  // GET /users/:userId/posts
  const { data } = useRead((api) => api.users[userId].posts.$get());

  // Cache tags: ['users', 'users/:userId', 'users/:userId/posts']
  return <PostList posts={data} />;
}
```

### Next.js Server Revalidation

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
// hooks.ts
import { enlaceHooks } from "enlace-next/client";
import { revalidateAction } from "./actions";

export const { useRead, useWrite } = enlaceHooks<ApiSchema, ApiError>(
  "https://api.example.com",
  {},
  { serverRevalidator: revalidateAction }
);
```

## Documentation

- [enlace-core](./packages/core/README.md) — Core API client
- [enlace](./packages/enlace/README.md) — React hooks
- [enlace-next](./packages/next/README.md) — Next.js integration
- [enlace-openapi](./packages/openapi/README.md) — OpenAPI generation
- [enlace-hono](./packages/hono/README.md) — Hono type adapter

## License

MIT
