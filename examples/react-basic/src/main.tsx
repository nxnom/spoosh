import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startMocking } from "./mocks/browser";
import { App } from "./App";
import "./styles.css";

async function bootstrap() {
  await startMocking();

  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root container not found");
  }

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

bootstrap();
