// The app's collections, declared before anything opens one.
import "../schema";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { JazzBootstrap } from "./app/auth-gate";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { UiProvider } from "./app/ui-context";
import { WorkspaceProvider } from "./app/workspace-context";
import { isDemoMode, seedDemoWorkspace } from "./platform/demo";
import { DEMO_DATABASE_NAME, useDatabase } from "./platform/storage";
import "./styles/index.css";

/* The landing page's frame is this app, pointed at `?demo=1`. Its notebook
   is a different database, chosen before anything reads one, and it never
   asks for an account — a visitor can use every control without signing in
   and without touching the notebook at /app/. */
const demo = isDemoMode();
if (demo) useDatabase(DEMO_DATABASE_NAME);

const root = document.getElementById("root");
if (!root) throw new Error("Notes could not find its window.");

/* Two boundaries, so a render error never leaves a blank window. One inside
   the workspace, around what draws it: the workspace stays open behind the
   message and goes on saving what was written. One outside everything, for
   an error in the workspace itself: Try again opens it afresh. Jazz's session
   sits between them: it owns the account and shows the sign-in window until
   one is ready. The demo has no session. */
void (async () => {
  if (demo) {
    try {
      await seedDemoWorkspace();
    } catch (error) {
      console.error(error);
    }
  }
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        {demo ? (
          <WorkspaceProvider>
            <ErrorBoundary>
              <UiProvider>
                <App />
              </UiProvider>
            </ErrorBoundary>
          </WorkspaceProvider>
        ) : (
          <JazzBootstrap>
            <ErrorBoundary>
              <UiProvider>
                <App />
              </UiProvider>
            </ErrorBoundary>
          </JazzBootstrap>
        )}
      </ErrorBoundary>
    </StrictMode>,
  );
})();
