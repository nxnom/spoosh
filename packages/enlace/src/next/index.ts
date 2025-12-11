import {
  createProxyHandler,
  type EnlaceClient,
  type EnlaceOptions,
  type WildcardClient,
} from "enlace-core";
import { executeNextFetch } from "./fetch";
import type { NextOptions, NextRequestOptionsBase } from "./types";

export function createEnlaceNext<TSchema = unknown, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions | null = {},
  nextOptions: NextOptions = {}
): unknown extends TSchema
  ? WildcardClient<NextRequestOptionsBase>
  : EnlaceClient<TSchema, TDefaultError, NextRequestOptionsBase> {
  const combinedOptions = { ...defaultOptions, ...nextOptions };
  return createProxyHandler(
    baseUrl,
    combinedOptions,
    [],
    executeNextFetch
  ) as unknown extends TSchema
    ? WildcardClient<NextRequestOptionsBase>
    : EnlaceClient<TSchema, TDefaultError, NextRequestOptionsBase>;
}

export * from "./types";
