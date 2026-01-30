/* eslint-disable @typescript-eslint/no-unused-vars */
import type { StripPrefix } from "./schema.types";

type TestSchema = {
  api: { GET: { data: string } };
  "api/users": { GET: { data: { id: number; name: string }[] } };
  "api/users/:id": { GET: { data: { id: string; name: string } } };
  "api/posts/:id": {
    GET: { data: { id: string; title: string } };
    PUT: { data: { updated: boolean }; body: { title: string } };
  };
  health: { GET: { data: { status: string } } };
};

// =============================================================================
// StripPrefix tests
// =============================================================================

type StrippedSchema = StripPrefix<TestSchema, "api">;

const _spRoot: StrippedSchema[""]["GET"]["data"] = "hello";

const _spUsers: StrippedSchema["users"]["GET"]["data"] = [
  { id: 1, name: "John" },
];

const _spUsersId: StrippedSchema["users/:id"]["GET"]["data"] = {
  id: "1",
  name: "John",
};

const _spPostsIdGet: StrippedSchema["posts/:id"]["GET"]["data"] = {
  id: "1",
  title: "Hello",
};

const _spPostsIdPut: StrippedSchema["posts/:id"]["PUT"]["data"] = {
  updated: true,
};

const _spPostsIdPutBody: StrippedSchema["posts/:id"]["PUT"]["body"] = {
  title: "New Title",
};

const _spHealth: StrippedSchema["health"]["GET"]["data"] = { status: "ok" };

// =============================================================================
// StripPrefix with leading slash prefix
// =============================================================================

type StrippedWithLeadingSlash = StripPrefix<TestSchema, "/api">;

const _spLsUsers: StrippedWithLeadingSlash["users"]["GET"]["data"] = [
  { id: 1, name: "Jane" },
];

// =============================================================================
// StripPrefix with trailing slash prefix
// =============================================================================

type StrippedWithTrailingSlash = StripPrefix<TestSchema, "api/">;

const _spTsUsers: StrippedWithTrailingSlash["users"]["GET"]["data"] = [
  { id: 1, name: "Bob" },
];

// =============================================================================
// StripPrefix with empty prefix (no change)
// =============================================================================

type StrippedEmpty = StripPrefix<TestSchema, "">;

const _spEmptyApi: StrippedEmpty["api"]["GET"]["data"] = "hello";
const _spEmptyUsers: StrippedEmpty["api/users"]["GET"]["data"] = [
  { id: 1, name: "Alice" },
];
