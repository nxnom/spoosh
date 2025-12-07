# enlace-core

Core fetch wrapper and type-safe API client for Enlace.

## Installation

```bash
npm install enlace-core
```

## Usage

### Basic Setup

```typescript
import { createEnlace } from "enlace-core";

const api = createEnlace("https://api.example.com");

// Make requests
const response = await api.users.get();
if (response.ok) {
  console.log(response.data);
} else {
  console.error(response.error);
}
```

### Type-Safe Schema

Define your API schema for full type safety:

```typescript
import { createEnlace, Endpoint } from "enlace-core";

type ApiSchema = {
  users: {
    $get: Endpoint<User[], ApiError>;
    $post: Endpoint<User, ApiError, CreateUser>;
    _: {
      $get: Endpoint<User, NotFoundError>;
      $put: Endpoint<User, ApiError, UpdateUser>;
      $delete: Endpoint<void, ApiError>;
    };
  };
  posts: {
    $get: Endpoint<Post[], ApiError>;
  };
};

const api = createEnlace<ApiSchema>("https://api.example.com");

// Fully typed!
const users = await api.users.get();
const user = await api.users[123].get();
const newUser = await api.users.post({ body: { name: "John" } });
```

### Schema Conventions

- `$get`, `$post`, `$put`, `$patch`, `$delete` — HTTP method endpoints
- `_` — Dynamic path segment (e.g., `/users/:id`)

```typescript
type Schema = {
  users: {
    $get: Endpoint<User[], ApiError>;           // GET /users
    $post: Endpoint<User, ApiError>;            // POST /users
    _: {                                        // /users/:id
      $get: Endpoint<User, ApiError>;           // GET /users/:id
      profile: {
        $get: Endpoint<Profile, ApiError>;      // GET /users/:id/profile
      };
    };
  };
};

// Usage
api.users.get();              // GET /users
api.users[123].get();         // GET /users/123
api.users[123].profile.get(); // GET /users/123/profile
```

## API Reference

### `createEnlace<TSchema>(baseUrl, options?)`

Creates a type-safe API client.

```typescript
const api = createEnlace<ApiSchema>("https://api.example.com", {
  headers: {
    Authorization: "Bearer token",
  },
});
```

**Parameters:**
- `baseUrl` — Base URL for all requests (supports relative paths in browser)
- `options` — Default options for all requests

**Options:**
```typescript
type EnlaceOptions = {
  headers?: HeadersInit;
  cache?: RequestCache;
  // ...other fetch options
};
```

### `Endpoint<TData, TError, TBody?>`

Type helper for defining endpoints:

```typescript
type Endpoint<TData, TError, TBody = never> = {
  data: TData;
  error: TError;
  body: TBody;
};
```

### Request Options

Per-request options:

```typescript
api.users.post({
  body: { name: "John" },
  query: { include: "profile" },
  headers: { "X-Custom": "value" },
  cache: "no-store",
});
```

**Available options:**
- `body` — Request body (auto-serialized to JSON for objects/arrays)
- `query` — Query parameters (auto-serialized)
- `headers` — Request headers (merged with defaults)
- `cache` — Cache mode

### Response Type

All requests return `EnlaceResponse<TData, TError>`:

```typescript
type EnlaceResponse<TData, TError> =
  | { ok: true; status: number; data: TData }
  | { ok: false; status: number; error: TError };
```

**Usage with type narrowing:**

```typescript
const response = await api.users.get();

if (response.ok) {
  // response.data is typed as User[]
  console.log(response.data);
} else {
  // response.error is typed as ApiError
  console.error(response.error);
}
```

## Features

### Relative URLs

In browser environments, relative URLs are automatically resolved:

```typescript
const api = createEnlace("/api");
// Resolves to: http://localhost:3000/api/...
```

### Auto JSON Serialization

Objects and arrays are automatically JSON-serialized:

```typescript
api.users.post({
  body: { name: "John" }, // Automatically JSON.stringify'd
});
```

### Query Parameters

Query parameters are automatically serialized:

```typescript
api.posts.get({
  query: {
    page: 1,
    limit: 10,
    active: true,
  },
});
// GET /posts?page=1&limit=10&active=true
```

## License

MIT
