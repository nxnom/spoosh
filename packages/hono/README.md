# enlace-hono

Type adapter to convert [Hono](https://hono.dev) app types to Enlace's ApiSchema format.

## Installation

```bash
npm install enlace-hono
# peer dependencies
npm install hono enlace-core
```

## Usage

```typescript
// server.ts (Hono)
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const postSchema = z.object({ title: z.string() });

const app = new Hono()
  .basePath("/api")
  .get("/posts", (c) => c.json([{ id: 1, title: "Hello" }]))
  .post("/posts", zValidator("json", postSchema), (c) => {
    const body = c.req.valid("json");
    return c.json({ id: 2, ...body }, 201);
  })
  .get("/posts/:id", (c) => c.json({ id: c.req.param("id"), title: "Post" }));

export type AppType = typeof app;
```

```typescript
// client.ts (Enlace)
import { enlace } from "enlace-core";
import type { HonoToEnlace } from "enlace-hono";
import type { AppType } from "./server";

type ApiSchema = HonoToEnlace<AppType>;

// Use the 'api' key since basePath is '/api'
const client = enlace<ApiSchema["api"]>("http://localhost:3000/api");

// Fully typed!
const posts = await client.posts.$get(); // { id: number, title: string }[]
const post = await client.posts["123"].$get(); // { id: string, title: string }
const newPost = await client.posts.$post({
  body: { title: "New Post" },
}); // { id: number, title: string }
```

## Type Transformation

`HonoToEnlace` converts Hono's flat path schema to Enlace's nested structure:

| Hono                      | Enlace                             |
| ------------------------- | ---------------------------------- |
| `"/api/posts"`            | `{ api: { posts: {...} } }`        |
| `"/api/posts/:id"`        | `{ api: { posts: { _: {...} } } }` |
| `{ input: { json: T } }`  | `Endpoint<Output, T>`              |
| `{ input: { query: T } }` | `EndpointWithQuery<Output, T>`     |
| `{ input: { form: T } }`  | `EndpointWithFormData<Output, T>`  |

## License

MIT
