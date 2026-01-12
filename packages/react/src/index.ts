"use client";

export { createReactSpoosh, type SpooshReactHooks } from "./createReactSpoosh";

export type {
  PluginHooksConfig,
  BaseReadOptions,
  UseReadResult,
  UseWriteResult,
  UseInfiniteReadResult,
  BaseReadResult,
  BaseWriteResult,
  BaseInfiniteReadResult,
  BaseInfiniteReadOptions,
} from "./types";

export { nextjsPlugin } from "./plugins/nextjs";
export type {
  NextjsPluginConfig,
  NextjsWriteOptions,
  ServerRevalidateHandler,
} from "./plugins/nextjs";
