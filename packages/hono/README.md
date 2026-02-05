# @spoosh/hono

Type adapter to convert [Hono](https://hono.dev) app types to Spoosh's ApiSchema format.

**[Documentation](https://spoosh.dev/docs/react/integrations/hono)** · **Requirements:** TypeScript >= 5.0

## Installation

```bash
npm install @spoosh/hono
```

## Usage

### Server (Hono)

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono()
  .basePath("/api")
  .get("/posts", (c) => {
    return c.json([
      { id: 1, title: "Hello World" },
      { id: 2, title: "Getting Started" },
    ]);
  })
  .post("/posts", zValidator("json", z.object({ title: z.string() })), (c) => {
    const body = c.req.valid("json");
    return c.json({ id: 3, title: body.title });
  })
  .get("/posts/:id", (c) => {
    const id = c.req.param("id");
    return c.json({ id: Number(id), title: "Post Title" });
  })
  .delete("/posts/:id", (c) => {
    return c.json({ success: true });
  });

// Export the app type for client usage
export type AppType = typeof app;
```

### Client (Spoosh)

```typescript
import { Spoosh } from "@spoosh/core";
import type { HonoToSpoosh } from "@spoosh/hono";
import type { AppType } from "./server";

// Transform Hono app type to Spoosh schema
type ApiSchema = HonoToSpoosh<AppType>;

const spoosh = new Spoosh<ApiSchema, Error>("http://localhost:3000/api");

// Fully typed API calls
const { data: posts } = await spoosh.api("posts").GET();
// posts is typed as { id: number; title: string }[]

const { data: newPost } = await spoosh.api("posts").POST({
  body: { title: "New Post" },
});
// body is typed, newPost is { id: number; title: string }

// Dynamic segment with params
const { data: post } = await spoosh.api("posts/:id").GET({ params: { id: 1 } });
// post is typed as { id: number; title: string }

// With variable
const postId = 1;
const { data } = await spoosh.api("posts/:id").GET({ params: { id: postId } });
```

## Type Mapping

| Hono                          | Spoosh                           |
| ----------------------------- | -------------------------------- |
| `c.json(data)`                | Response data type               |
| `zValidator("json", schema)`  | Request body type                |
| `zValidator("query", schema)` | Query params type                |
| `zValidator("form", schema)`  | Form data type                   |
| `/posts/:id`                  | `"posts/:id"` (path with params) |

## API Reference

### HonoToSpoosh<T>

Type utility that transforms a Hono app type into Spoosh's ApiSchema format.

```typescript
import type { HonoToSpoosh } from "@spoosh/hono";
import type { AppType } from "./server";

type ApiSchema = HonoToSpoosh<AppType>;
```

**Supported HTTP methods:**

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`

**Path parameters:**

Dynamic segments (`:id`, `:slug`, etc.) are preserved in the path and accessed via the `params` option:

```typescript
// Hono route: /users/:userId/posts/:postId

// Access with params object
spoosh.api("users/:userId/posts/:postId").GET({
  params: { userId: 123, postId: 456 },
});

// With variables
const userId = 123;
const postId = 456;
spoosh.api("users/:userId/posts/:postId").GET({
  params: { userId, postId },
});
```

## Handling Large Apps (TS2589)

Due to Spoosh's flat schema structure, TS2589 errors are rare. If you do encounter them with very large route trees, follow the [Hono RPC best practices](https://hono.dev/docs/guides/rpc) for splitting routes into smaller groups.
