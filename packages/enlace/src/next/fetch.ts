import {
  executeFetch,
  composeMiddlewares,
  type AnyRequestOptions,
  type EnlaceCallbacks,
  type EnlaceMiddleware,
  type EnlaceOptions,
  type EnlaceResponse,
  type HttpMethod,
} from "enlace-core";
import type { AnyReactRequestOptions } from "../react/types";
import type { NextOptions, NextRequestOptionsBase } from "./types";
import { createNextFetchOptionsMiddleware } from "./middlewares/nextFetchOptions";
import { createServerRevalidationMiddleware } from "./middlewares/serverRevalidation";

type CombinedOptions = EnlaceOptions & NextOptions & EnlaceCallbacks;

type AnyNextRequestOptions = AnyRequestOptions &
  AnyReactRequestOptions &
  NextRequestOptionsBase;

export async function executeNextFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  combinedOptions: CombinedOptions,
  requestOptions?: AnyNextRequestOptions
): Promise<EnlaceResponse<TData, TError>> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    skipServerRevalidation = false,
    serverRevalidator,
    middlewares: userMiddlewares,
    ...coreOptions
  } = combinedOptions;

  const internalMiddlewares = [
    createNextFetchOptionsMiddleware({
      autoGenerateTags,
    }),
    createServerRevalidationMiddleware({
      serverRevalidator,
      skipServerRevalidation,
      autoRevalidateTags,
    }),
  ] as EnlaceMiddleware<TData, TError>[];

  const middlewares = composeMiddlewares<TData, TError>(
    internalMiddlewares,
    userMiddlewares as EnlaceMiddleware<TData, TError>[] | undefined
  );

  return executeFetch<TData, TError>(
    baseUrl,
    path,
    method,
    coreOptions,
    requestOptions,
    { middlewares }
  );
}
