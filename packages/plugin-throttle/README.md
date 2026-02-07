# @spoosh/plugin-throttle

Request throttling plugin for Spoosh - limits request frequency.

**[Documentation](https://spoosh.dev/docs/react/plugins/throttle)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-throttle
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { throttlePlugin } from "@spoosh/plugin-throttle";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  // ...otherPlugins,
  throttlePlugin(),
]);

const { data } = useRead((api) => api("expensive").GET(), { throttle: 1000 });
```

## Options

### Per-Request Options

| Option     | Type     | Description                                                          |
| ---------- | -------- | -------------------------------------------------------------------- |
| `throttle` | `number` | Max 1 request per X milliseconds. Extra requests return cached data. |

## Notes

- This plugin runs with priority 100, automatically executing last in the middleware chain to block all requests (including force fetches) that exceed the throttle limit
- Unlike debounce (which delays), throttle immediately returns cached data for extra requests
- Useful for rate-limiting expensive endpoints
