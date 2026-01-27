export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type WriteMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type Simplify<T> = { [K in keyof T]: T[K] } & {};
