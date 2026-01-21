import type { IStringifyOptions } from "qs";

export type QsPluginConfig = IStringifyOptions;

export type QsOptions = IStringifyOptions;

export interface QsReadHookOptions {
  qs?: QsOptions;
}

export interface QsWriteHookOptions {
  qs?: QsOptions;
}

export interface QsInfiniteReadHookOptions {
  qs?: QsOptions;
}

export type QsReadResult = object;

export type QsWriteResult = object;
