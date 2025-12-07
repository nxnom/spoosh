import { useRef, useState } from "react";
import type { EnlaceResponse } from "enlace-core";
import type { HookState, UseEnlaceSelectorResult } from "./types";

export function useSelectorMode<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
  TMethod extends (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>,
>(
  method: (...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>
): UseEnlaceSelectorResult<TMethod> {
  const [state, setState] = useState<HookState>({
    loading: false,
    ok: undefined,
    data: undefined,
    error: undefined,
  });

  const methodRef = useRef(method);
  const triggerRef = useRef<TMethod | null>(null);

  methodRef.current = method;

  if (!triggerRef.current) {
    triggerRef.current = (async (...args: unknown[]) => {
      setState((s) => ({ ...s, loading: true }));
      const res = await methodRef.current(...args);
      setState({
        loading: false,
        ok: res.ok,
        data: res.ok ? res.data : undefined,
        error: res.ok ? undefined : res.error,
      });
      return res;
    }) as TMethod;
  }

  return {
    trigger: triggerRef.current,
    ...state,
  } as UseEnlaceSelectorResult<TMethod>;
}
