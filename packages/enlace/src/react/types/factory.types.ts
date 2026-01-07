import type { UseAPIQuery } from "./query.types";
import type { UseAPIMutation } from "./mutation.types";

export type EnlaceHooks<TSchema, TDefaultError = unknown> = [
  UseAPIQuery<TSchema, TDefaultError>,
  UseAPIMutation<TSchema, TDefaultError>,
];
