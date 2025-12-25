# enlace-core

Core fetch wrapper and type-safe API client for Enlace.

## Installation

```bash
npm install enlace-core
```

## Usage

### Basic Setup

```typescript
import { enlace } from "enlace-core";

const api = enlace("https://api.example.com");

// Make requests
const response = await api.users.get();
if (response.error) {
  console.error(response.error);
  return;
}
console.log(response.data); // data is typed as non-undefined here
```

### Type-Safe Schema

Define your API schema for full type safety:

```typescript
import { enlace, Endpoint } from "enlace-core";

// Define your API error type
type ApiError = { message: string; code: number };

type ApiSchema = {
  users: {
    $get: User[];                               // Simple: just data type
    $post: Endpoint<User, CreateUser>;          // Data + Body
    _: {
      $get: User;                               // Simple: just data type
      $put: Endpoint<User, UpdateUser>;         // Data + Body
      $delete: void;                            // void response
    };
  };
  posts: {
    $get: Post[];
    $post: Endpoint<Post, CreatePost, CustomError>;  // Custom error override
  };
};

// Pass global error type as second generic
const api = enlace<ApiSchema, ApiError>("https://api.example.com");

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
    $get: User[];                               // GET /users
    $post: Endpoint<User, CreateUser>;          // POST /users with body
    _: {                                        // /users/:id
      $get: User;                               // GET /users/:id
      $delete: void;                            // DELETE /users/:id
      profile: {
        $get: Profile;                          // GET /users/:id/profile
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

### `enlace<TSchema, TDefaultError>(baseUrl, options?, callbacks?)`

Creates a type-safe API client.

```typescript
type ApiError = { message: string };

const api = enlace<ApiSchema, ApiError>("https://api.example.com", {
  headers: {
    Authorization: "Bearer token",
  },
});
```

**Generic Parameters:**
- `TSchema` — API schema type defining endpoints
- `TDefaultError` — Default error type for all endpoints (default: `unknown`)

**Function Parameters:**
- `baseUrl` — Base URL for all requests (supports relative paths in browser)
- `options` — Default options for all requests
- `callbacks` — Global callbacks (`onSuccess`, `onError`)

**Options:**
```typescript
type EnlaceOptions = {
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  cache?: RequestCache;
  // ...other fetch options
};
```

### Async Headers

Headers can be provided as a static value, sync function, or async function. This is useful when you need to fetch headers dynamically (e.g., auth tokens from async storage):

```typescript
// Static headers
const api = enlace("https://api.example.com", {
  headers: { Authorization: "Bearer token" },
});

// Sync function
const api = enlace("https://api.example.com", {
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});

// Async function
const api = enlace("https://api.example.com", {
  headers: async () => {
    const token = await getTokenFromStorage();
    return { Authorization: `Bearer ${token}` };
  },
});
```

This also works for per-request headers:

```typescript
api.users.get({
  headers: async () => {
    const token = await refreshToken();
    return { Authorization: `Bearer ${token}` };
  },
});
```

### Global Callbacks

You can set up global `onSuccess` and `onError` callbacks that are called for every request:

```typescript
const api = enlace<ApiSchema>("https://api.example.com", {
  headers: { Authorization: "Bearer token" },
}, {
  onSuccess: (payload) => {
    console.log("Request succeeded:", payload.status, payload.data);
  },
  onError: (payload) => {
    if (payload.status === 0) {
      // Network error
      console.error("Network error:", payload.error.message);
    } else {
      // HTTP error
      console.error("HTTP error:", payload.status, payload.error);
    }
  },
});
```

**Callback Payloads:**

```typescript
// onSuccess payload
type EnlaceCallbackPayload<T> = {
  status: number;
  data: T;
  headers: Headers;
};

// onError payload (HTTP error or network error)
type EnlaceErrorCallbackPayload<T> =
  | { status: number; error: T; headers: Headers }  // HTTP error
  | { status: 0; error: Error; headers: null };     // Network error
```

**Use cases:**
- Global error logging/reporting
- Toast notifications
- Authentication refresh on 401 errors
- Analytics tracking

### `Endpoint<TData, TBody?, TError?>`

Type helper for defining endpoints with JSON body:

```typescript
// Signature: Endpoint<TData, TBody?, TError?>
type Endpoint<TData, TBody = never, TError = never>;
```

**Three ways to define endpoints:**

```typescript
type ApiSchema = {
  posts: {
    $get: Post[];                                   // Direct type (simplest)
    $post: Endpoint<Post, CreatePost>;              // Data + Body
    $put: Endpoint<Post, UpdatePost, CustomError>;  // Data + Body + Custom Error
    $delete: void;                                  // void response
  };
};

// Global error type applies to all endpoints without explicit error
const api = enlace<ApiSchema, ApiError>("https://api.example.com");
```

### `EndpointWithQuery<TData, TQuery, TError?>`

Type helper for endpoints with typed query parameters:

```typescript
import { EndpointWithQuery } from "enlace-core";

type ApiSchema = {
  users: {
    $get: EndpointWithQuery<User[], { page: number; limit: number; search?: string }>;
  };
  posts: {
    $get: EndpointWithQuery<Post[], { status: "draft" | "published" }, ApiError>;
  };
};

// Usage - query params are fully typed
api.users.get({ query: { page: 1, limit: 10 } });
api.users.get({ query: { page: 1, limit: 10, search: "john" } });
// api.users.get({ query: { foo: "bar" } }); // ✗ Error: 'foo' does not exist
```

### `EndpointWithFormData<TData, TFormData, TError?>`

Type helper for endpoints with file uploads (multipart/form-data):

```typescript
import { EndpointWithFormData } from "enlace-core";

type ApiSchema = {
  uploads: {
    $post: EndpointWithFormData<Upload, { file: Blob | File; name: string }>;
  };
  avatars: {
    $post: EndpointWithFormData<Avatar, { image: File }, UploadError>;
  };
};

// Usage - formData is automatically converted to FormData
api.uploads.post({
  formData: {
    file: selectedFile,        // File object
    name: "document.pdf",      // String - converted automatically
  }
});
// → Sends as multipart/form-data
```

**FormData conversion rules:**

| Type | Conversion |
|------|------------|
| `File` / `Blob` | Appended directly |
| `string` / `number` / `boolean` | Converted to string |
| `object` (nested) | JSON stringified |
| `array` of primitives | Each item appended separately |
| `array` of files | Each file appended with same key |
| `null` / `undefined` | Skipped |

### `EndpointFull<T>`

Object-style type helper for complex endpoints with multiple options:

```typescript
import { EndpointFull } from "enlace-core";

type ApiSchema = {
  products: {
    $post: EndpointFull<{
      data: Product;
      body: CreateProduct;
      query: { categoryId: string };
      error: ValidationError;
    }>;
  };
  search: {
    $get: EndpointFull<{
      data: SearchResult[];
      query: { q: string; page?: number; limit?: number };
    }>;
  };
  files: {
    $post: EndpointFull<{
      data: FileUpload;
      formData: { file: File; description: string };
      query: { folder: string };
      error: UploadError;
    }>;
  };
};

// Usage
api.products.post({
  body: { name: "Widget" },
  query: { categoryId: "electronics" }
});
```

**Available properties:**

| Property | Description |
|----------|-------------|
| `data` | Response data type (required) |
| `body` | JSON request body type |
| `query` | Query parameters type |
| `formData` | FormData fields type (for file uploads) |
| `error` | Error response type |

### Request Options

Per-request options:

```typescript
api.users.post({
  body: { name: "John" },
  query: { include: "profile" },
  headers: { "X-Custom": "value" },
  cache: "no-store",
});

// FormData request
api.uploads.post({
  formData: { file: selectedFile, name: "document.pdf" },
});
```

**Available options:**
- `body` — Request body (auto-serialized to JSON for objects/arrays)
- `query` — Query parameters (auto-serialized). Typed when using `EndpointWithQuery` or `EndpointFull`
- `formData` — FormData fields (auto-converted to native FormData). Use with `EndpointWithFormData` or `EndpointFull`
- `headers` — Request headers (merged with defaults). Can be `HeadersInit` or `() => HeadersInit | Promise<HeadersInit>`
- `cache` — Cache mode

### Response Type

All requests return `EnlaceResponse<TData, TError>`:

```typescript
type EnlaceResponse<TData, TError> =
  | { status: number; data: TData; error?: undefined }
  | { status: number; data?: undefined; error: TError };
```

**Usage with type narrowing:**

```typescript
const response = await api.users.get();

if (response.error) {
  // response.error is typed as ApiError
  console.error(response.error);
  return;
}
// response.data is typed as User[] (no longer undefined)
console.log(response.data);
```

## Features

### Relative URLs

In browser environments, relative URLs are automatically resolved:

```typescript
const api = enlace("/api");
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

## OpenAPI Generation

Generate OpenAPI 3.0 specs from your TypeScript schema using [`enlace-openapi`](../openapi/README.md):

```bash
npm install enlace-openapi
enlace-openapi --schema ./types/APISchema.ts --output ./openapi.json
```

## License

MIT
