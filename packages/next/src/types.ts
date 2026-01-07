export { type EnlaceOptions, type EnlaceCallbacks } from "enlace-core";
import type {
  EnlaceCallbacks,
  EnlaceMiddleware,
  MethodOptionsMap,
} from "enlace-core";
import type {
  EnlaceHookOptions,
  MutationRequestOptions,
  QueryRequestOptions,
} from "enlace";

export type ServerRevalidateHandler = (
  tags: string[],
  paths: string[]
) => void | Promise<void>;

export type NextOptions = Pick<
  EnlaceHookOptions,
  "autoGenerateTags" | "autoRevalidateTags"
> &
  EnlaceCallbacks & {
    serverRevalidator?: ServerRevalidateHandler;
    skipServerRevalidation?: boolean;
    middlewares?: EnlaceMiddleware[];
  };

export type NextHookOptions = EnlaceHookOptions &
  Pick<NextOptions, "serverRevalidator" | "skipServerRevalidation">;

export type NextQueryRequestOptions = QueryRequestOptions & {
  revalidate?: number | false;
};

export type NextMutationRequestOptions = MutationRequestOptions & {
  revalidatePaths?: string[];
  serverRevalidate?: boolean;
};

export type NextOptionsMap = MethodOptionsMap<
  NextQueryRequestOptions,
  NextMutationRequestOptions
>;

export type NextRequestOptionsBase = NextQueryRequestOptions &
  NextMutationRequestOptions;
