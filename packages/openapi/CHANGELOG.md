# @spoosh/openapi

## 0.2.0

### Breaking Changes

- **Flat Schema Output**: Import now generates flat path-based schema instead of nested structure
  - Old: Nested object with `$get`, `$post` methods and `_` wildcard
  - New: Flat object with `"path/:param"` keys and `GET`, `POST` methods
- **Export Updated**: Export now expects flat schema format with `GET`, `POST` methods

### Features

- Topological sorting for schema dependencies (fixes forward reference issues)
- Schema name collision detection with automatic suffix (`_2`, `_3`, etc.)

### Bug Fixes

- Fixed `deduplicateUnion` to properly handle types containing `|` (e.g., `{ a: string | null }`)
- Fixed circular reference errors by using `{ [key: string]: T }` instead of `Record<string, T>`
- Fixed path parameter extraction from flat paths (`:id` → `{id}`)

### Example

**Generated schema format:**

```typescript
type ApiSchema = {
  "pet": { GET: { data: Pet[] }; POST: { data: Pet; body: CreatePet } };
  "pet/:petId": { GET: { data: Pet }; DELETE: { data: void } };
};
```

## 0.1.2

### Patch Changes

- Fix homepage URL to point to correct documentation path

## 0.1.1

### Patch Changes

- Stable release

## 0.1.0-beta.0

### Features

- Initial beta release
- `OpenAPIToSpoosh` type transformer for converting OpenAPI schemas to Spoosh schema
- Full type inference from OpenAPI specification
- Support for all HTTP methods
- Path parameter handling
- Request/response body type extraction
- Query parameter type extraction
