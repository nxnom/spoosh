# Enlace

> **Enlace** (Spanish: /enˈla.se/) — *link, connection, bond*

The missing link between your API schema and your UI.

## Philosophy

APIs are structured. Your code should reflect that structure.

Enlace takes a different approach to data fetching. Instead of treating API calls as disconnected fetch operations, Enlace models your entire API as a navigable type-safe object. Your API paths become your code paths.

```typescript
// Your API structure IS your code structure
api.users[userId].posts.$get()
api.teams[teamId].members[memberId].$delete()
```

No route strings. No path templates. No runtime typos. Just types, all the way down.

## Core Ideas

**Schema-First** — Define your API shape once. TypeScript infers the rest.

**Proxy Navigation** — Navigate your API like a file system. Paths are validated at compile time.

**Zero Configuration Caching** — Cache tags are derived from URL structure automatically. `GET /posts/123` caches under `['posts', 'posts/123']`. Mutations to `/posts` invalidate what they should.

**Framework Native** — First-class React hooks. Native Next.js cache integration with ISR and server revalidation.

## Packages

| Package | Description |
|---------|-------------|
| [`enlace-core`](./packages/core) | Core fetch wrapper and type-safe API client |
| [`enlace`](./packages/enlace) | React hooks and Next.js integration |
| [`enlace-openapi`](./packages/openapi) | Generate OpenAPI specs from TypeScript schema |
| [`enlace-hono`](./packages/hono) | Type adapter for Hono framework |

## Installation

```bash
# For React / Next.js projects
npm install enlace

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
    $get: Post[];                                   // GET /posts → Post[]
    $post: Endpoint<Post, CreatePost>;              // POST /posts
    _: {
      $get: Post;                                   // GET /posts/:id → Post
      $put: Endpoint<Post, UpdatePost>;             // PUT /posts/:id
      $delete: void;                                // DELETE /posts/:id
    };
  };
  users: {
    _: {
      $get: User;
      posts: {
        $get: Post[];                               // GET /users/:id/posts
      };
    };
  };
};
```

### Create Your Hook

```typescript
import { enlaceHookReact } from "enlace/hook";

const useAPI = enlaceHookReact<ApiSchema, ApiError>("https://api.example.com");
```

### Read Data

```typescript
function PostList() {
  const { data, isLoading, error } = useAPI((api) => api.posts.$get());

  if (isLoading) return <div>Loading...</div>;
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
  const { trigger, isMutating } = useAPI((api) => api.posts.$post);

  const handleSubmit = async (title: string) => {
    await trigger({ body: { title } });
    // Cache for 'posts' is automatically invalidated
  };

  return <button onClick={() => handleSubmit("New Post")} disabled={isMutating}>Create</button>;
}
```

### Dynamic Routes

```typescript
function UserPosts({ userId }: { userId: string }) {
  // GET /users/:userId/posts
  const { data } = useAPI((api) => api.users[userId].posts.$get());

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
// useAPI.ts
import { enlaceHookNext } from "enlace/hook";
import { revalidateAction } from "./actions";

const useAPI = enlaceHookNext<ApiSchema, ApiError>("https://api.example.com", {}, {
  serverRevalidator: revalidateAction,
});
```

## Documentation

- [enlace-core](./packages/core/README.md) — Core API client
- [enlace](./packages/enlace/README.md) — React hooks and Next.js
- [enlace-openapi](./packages/openapi/README.md) — OpenAPI generation
- [enlace-hono](./packages/hono/README.md) — Hono type adapter

## License

MIT
