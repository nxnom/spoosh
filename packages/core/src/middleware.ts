import type {
  EnlaceMiddleware,
  MiddlewareContext,
  MiddlewarePhase,
} from "./types";

export function createMiddleware<TData = unknown, TError = unknown>(
  name: string,
  phase: MiddlewarePhase,
  handler: EnlaceMiddleware<TData, TError>["handler"]
): EnlaceMiddleware<TData, TError> {
  return { name, phase, handler };
}

export async function applyMiddlewares<TData = unknown, TError = unknown>(
  context: MiddlewareContext<TData, TError>,
  middlewares: EnlaceMiddleware<TData, TError>[],
  phase: MiddlewarePhase
): Promise<MiddlewareContext<TData, TError>> {
  const phaseMiddlewares = middlewares.filter((m) => m.phase === phase);

  let ctx = context;

  for (const middleware of phaseMiddlewares) {
    ctx = await middleware.handler(ctx);
  }

  return ctx;
}

export function composeMiddlewares<TData = unknown, TError = unknown>(
  ...middlewareLists: (EnlaceMiddleware<TData, TError>[] | undefined)[]
): EnlaceMiddleware<TData, TError>[] {
  return middlewareLists.flat().filter(Boolean) as EnlaceMiddleware<
    TData,
    TError
  >[];
}
