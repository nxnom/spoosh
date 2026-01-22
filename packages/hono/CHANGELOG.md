# @spoosh/hono

## 0.2.4

### Patch Changes

- Fix homepage URL to point to correct documentation path

## 0.2.3

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.4.0

## 0.2.2

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.3.0

## 0.2.0

## Breaking Changes

- Use `hc` return type of Hono handlers to support multiple hono versions
- Create `HonoRouteToSpoosh` type transformer for converting individual Hono route types to Spoosh schema

## 0.1.1

### Patch Changes

- Updated documentation for new `Spoosh` class API

## 0.1.0-beta.0

### Features

- Initial beta release
- `HonoToSpoosh` type transformer for converting Hono app types to Spoosh schema
- Full type inference from Hono routes
- Support for all HTTP methods
- Path parameter handling (`:id` → dynamic segments)
- Request body type extraction from zod validators
- Query parameter type extraction
