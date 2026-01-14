import type { IStringifyOptions } from "qs";

export interface QsPluginConfig {
  /** Array format for serialization. Defaults to "brackets". */
  arrayFormat?: "brackets" | "indices" | "repeat" | "comma";

  /** Use dot notation instead of brackets. Defaults to false. */
  allowDots?: boolean;

  /** Skip null values in serialization. Defaults to true. */
  skipNulls?: boolean;

  /** Additional qs stringify options. */
  options?: Omit<IStringifyOptions, "arrayFormat" | "allowDots" | "skipNulls">;
}

export interface QsReadOptions {
  /** Array format for serialization. Overrides plugin default. */
  arrayFormat?: "brackets" | "indices" | "repeat" | "comma";

  /** Use dot notation instead of brackets. Overrides plugin default. */
  allowDots?: boolean;

  /** Skip null values in serialization. Overrides plugin default. */
  skipNulls?: boolean;
}

export interface QsWriteOptions {
  /** Array format for serialization. Overrides plugin default. */
  arrayFormat?: "brackets" | "indices" | "repeat" | "comma";

  /** Use dot notation instead of brackets. Overrides plugin default. */
  allowDots?: boolean;

  /** Skip null values in serialization. Overrides plugin default. */
  skipNulls?: boolean;
}

export type QsInfiniteReadOptions = QsReadOptions;

export type QsReadResult = object;

export type QsWriteResult = object;
