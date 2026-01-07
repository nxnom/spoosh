import type { UseRead } from "./read.types";
import type { UseWrite } from "./write.types";
import type { UseInfiniteRead } from "./infinite-read.types";

export type EnlaceHooks<TSchema, TDefaultError = unknown> = {
  useRead: UseRead<TSchema, TDefaultError>;
  useWrite: UseWrite<TSchema, TDefaultError>;
  useInfiniteRead: UseInfiniteRead<TSchema, TDefaultError>;
};
