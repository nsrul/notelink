// The app's collections, declared before anything opens one.
import "../schema";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { JazzBootstrap } from "./app/auth-gate";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { UiProvider } from "./app/ui-context";
import "./styles/index.css";

/* Two boundaries, so a render error never leaves a blank window. One inside
   the workspace, around what draws it: the workspace stays open behind the
   message and goes on saving what was written. One outside everything, for
   an error in the workspace itself: Try again opens it afresh. Jazz's session
   sits between them: it owns the account and shows the sign-in window until
   one is ready. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <JazzBootstrap>
        <ErrorBoundary>
          <UiProvider>
            <App />
          </UiProvider>
        </ErrorBoundary>
      </JazzBootstrap>
    </ErrorBoundary>
  </StrictMode>,
);
