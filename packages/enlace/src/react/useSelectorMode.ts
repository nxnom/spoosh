import { useRef, useReducer } from "react";
import type { EnlaceResponse } from "enlace-core";
import type { ReactRequestOptionsBase, UseEnlaceSelectorResult } from "./types";
import { hookReducer, initialState } from "./reducer";
import { generateTags } from "../utils/generateTags";
import { invalidateTags } from "./revalidator";

export function useSelectorMode<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
  TMethod extends (...args: any[]) => Promise<EnlaceResponse<unknown, unknown>>,
>(
  method: (...args: unknown[]) => Promise<EnlaceResponse<unknown, unknown>>,
  path: string[],
  autoRevalidateTags: boolean
): UseEnlaceSelectorResult<TMethod> {
  const [state, dispatch] = useReducer(hookReducer, initialState);

  const methodRef = useRef(method);
  const triggerRef = useRef<TMethod | null>(null);
  const pathRef = useRef(path);
  const autoRevalidateRef = useRef(autoRevalidateTags);

  methodRef.current = method;
  pathRef.current = path;
  autoRevalidateRef.current = autoRevalidateTags;

  if (!triggerRef.current) {
    triggerRef.current = (async (...args: unknown[]) => {
      dispatch({ type: "FETCH_START" });
      const res = await methodRef.current(...args);

      if (res.ok) {
        dispatch({ type: "FETCH_SUCCESS", data: res.data });

        const options = args[0] as ReactRequestOptionsBase | undefined;
        const tagsToInvalidate =
          options?.revalidateTags ??
          (autoRevalidateRef.current ? generateTags(pathRef.current) : []);

        if (tagsToInvalidate.length > 0) {
          invalidateTags(tagsToInvalidate);
        }
      } else {
        dispatch({ type: "FETCH_ERROR", error: res.error });
      }

      return res;
    }) as TMethod;
  }

  return {
    trigger: triggerRef.current,
    ...state,
  } as UseEnlaceSelectorResult<TMethod>;
}
