# @spoosh/plugin-invalidation

Cache invalidation plugin for Spoosh - auto-invalidates related queries after mutations.

**[Documentation](https://spoosh.dev/docs/plugins/invalidation)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-invalidation
```

## How It Works

Tags are automatically generated from the API path hierarchy:

```typescript
// Query tags are generated from the path:
useRead((api) => api("users").GET());
// → tags: ["users"]

useRead((api) => api("users/:id").GET({ params: { id: 123 } }));
// → tags: ["users", "users/123"]

useRead((api) => api("users/:id/posts").GET({ params: { id: 123 } }));
// → tags: ["users", "users/123", "users/123/posts"]
```

When a mutation succeeds, related queries are automatically invalidated:

```typescript
// Creating a post at users/123/posts invalidates:
const { trigger } = useWrite((api) => api("users/:id/posts").POST);
await trigger({ params: { id: 123 }, body: { title: "New Post" } });

// ✓ Invalidates: "users", "users/123", "users/123/posts"
// All queries matching these tags will refetch automatically
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";

const client = new Spoosh<ApiSchema, Error>("/api").use([invalidationPlugin()]);

const { trigger } = useWrite((api) => api("posts").POST);
await trigger({ body: { title: "New Post" } });
```

## Default Configuration

```typescript
// Default: invalidate all related tags (full hierarchy)
invalidationPlugin(); // same as { autoInvalidate: "all" }

// Only invalidate the exact endpoint by default
invalidationPlugin({ autoInvalidate: "self" });

// Disable auto-invalidation by default (manual only)
invalidationPlugin({ autoInvalidate: "none" });
```

## Per-Request Override

```typescript
// Override to invalidate all related tags
await trigger({
  body: { title: "New Post" },
  autoInvalidate: "all",
});

// Override to only invalidate the exact endpoint
await trigger({
  body: { title: "New Post" },
  autoInvalidate: "self",
});

// Disable auto-invalidation and specify custom targets
await trigger({
  body: { title: "New Post" },
  autoInvalidate: "none",
  invalidate: (api) => [api("posts").GET, api("stats").GET, "dashboard-data"],
});

// Add specific tags (works alongside autoInvalidate)
await trigger({
  body: { title: "New Post" },
  invalidate: ["posts", "user-posts"],
});
```

## Options

### Plugin Config

| Option           | Type                        | Default | Description                        |
| ---------------- | --------------------------- | ------- | ---------------------------------- |
| `autoInvalidate` | `"all" \| "self" \| "none"` | `"all"` | Default auto-invalidation behavior |

### Per-Request Options

| Option           | Type                           | Description                              |
| ---------------- | ------------------------------ | ---------------------------------------- |
| `autoInvalidate` | `"all" \| "self" \| "none"`    | Override auto-invalidation behavior      |
| `invalidate`     | `string[] \| ((api) => [...])` | Specific tags or endpoints to invalidate |

### Auto-Invalidate Modes

| Mode     | Description                             | Example                                                     |
| -------- | --------------------------------------- | ----------------------------------------------------------- |
| `"all"`  | Invalidate all tags from path hierarchy | `users/123/posts` → `users`, `users/123`, `users/123/posts` |
| `"self"` | Only invalidate the exact endpoint tag  | `users/123/posts` → `users/123/posts`                       |
| `"none"` | Disable auto-invalidation (manual only) | No automatic invalidation                                   |

## Instance API

The plugin exposes `invalidate` for manually triggering cache invalidation outside of mutations:

```typescript
import { createReactSpoosh } from "@spoosh/react";

const { useRead, invalidate } = createReactSpoosh(client);

// Invalidate with string array
invalidate(["users", "posts"]);

// Invalidate with callback (type-safe API selector)
invalidate((api) => [api("users").GET, api("posts").GET, "custom-tag"]);

// Useful for external events like WebSocket messages
socket.on("data-changed", (tags) => {
  invalidate(tags);
});
```

| Method       | Description                                                        |
| ------------ | ------------------------------------------------------------------ |
| `invalidate` | Manually invalidate cache entries by tags or API selector callback |
