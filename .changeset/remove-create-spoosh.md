---
"@spoosh/core": minor
---

Replace `createSpoosh()` function with `Spoosh` class for cleaner API

**Breaking Change:** The `createSpoosh()` function has been removed.

**Before:**
```typescript
const plugins = [cachePlugin()] as const;
const client = createSpoosh<Schema, Error, typeof plugins>({
  baseUrl: "/api",
  plugins,
});
```

**After:**
```typescript
const client = new Spoosh<Schema, Error>("/api").use([
  cachePlugin(),
]);
```

Benefits:
- No more `as const` assertion needed
- No more `typeof plugins` generic parameter
- Cleaner, more intuitive API
- Full type inference preserved
