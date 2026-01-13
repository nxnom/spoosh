# @spoosh/test-utils

Test utilities for Spoosh plugins.

## Installation

```bash
npm install -D @spoosh/test-utils
```

## Usage

```typescript
import {
  createMockContext,
  createMockResponse,
  createMockNext,
  createState,
  createStateManager,
  createEventEmitter,
} from "@spoosh/test-utils";

describe("myPlugin", () => {
  it("should work", async () => {
    const plugin = myPlugin();
    const context = createMockContext({
      queryKey: "test-key",
      pluginOptions: { myOption: true },
    });
    const next = createMockNext({ data: { id: 1 } });

    const result = await plugin.middleware!(context, next);

    expect(result.data).toEqual({ id: 1 });
  });
});
```

## API

### `createMockContext(options?)`

Creates a mock `PluginContext` for testing plugins.

### `createMockResponse(overrides?)`

Creates a mock `SpooshResponse`.

### `createMockNext(response?)`

Creates a mock next function that returns a successful response.

### `createMockNextError(error)`

Creates a mock next function that throws an error.

### `createMockNextWithError(error, status?)`

Creates a mock next function that returns an error response.

### `createState(overrides?)`

Creates a default `OperationState` with optional overrides.

### `createStateManager()`

Re-exported from `@spoosh/core` for convenience.

### `createEventEmitter()`

Re-exported from `@spoosh/core` for convenience.
