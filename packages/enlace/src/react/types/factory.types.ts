import type { ReactOptionsMap } from "./request.types";
import type { UseRead } from "./read.types";
import type { UseWrite } from "./write.types";
import type { UseInfiniteRead } from "./infinite-read.types";

export type EnlaceHooks<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = {
  useRead: UseRead<TSchema, TDefaultError, TOptionsMap>;
  useWrite: UseWrite<TSchema, TDefaultError, TOptionsMap>;
  useInfiniteRead: UseInfiniteRead<TSchema, TDefaultError, TOptionsMap>;
};
