import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

const worker = setupWorker(...handlers);

export async function startMocking() {
  if (typeof window === "undefined") {
    return;
  }

  const workerUrl = "/mockServiceWorker.js";
  try {
    const response = await fetch(workerUrl, { cache: "no-store" });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("javascript")) {
      console.warn(
        "[MSW] Skipping worker start because /mockServiceWorker.js is missing or invalid. Run `pnpm --filter @spoosh/example-react-basic msw:init`."
      );
      return;
    }
  } catch {
    console.warn(
      "[MSW] Skipping worker start because /mockServiceWorker.js is unavailable. Run `pnpm --filter @spoosh/example-react-basic msw:init`."
    );
    return;
  }

  try {
    await worker.start({
      onUnhandledRequest: "bypass",
      quiet: true,
    });
  } catch (error) {
    console.error(
      "[MSW] Worker registration failed. Run `pnpm --filter @spoosh/example-react-basic msw:init` once, then restart dev server.",
      error
    );
  }
}
