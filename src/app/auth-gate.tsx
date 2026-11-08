import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { JazzProvider, useJazzAuth, useJazzClient, useSession, type JazzAuthState } from "jazz-tools/react";
import { AuthScreen } from "../features/auth/AuthScreen";
import { authClient } from "../platform/auth-client";
import { jazzBackendEnabled } from "../platform/jazz-config";
import { stopAppJazzSync } from "../platform/jazz-sync";
import { WorkspaceProvider, type WorkspaceJazz } from "./workspace-context";

/** Asks this host whether it can admit an account. A static build cannot, so
 *  the notebook stays in this browser. */
export function JazzBootstrap({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void jazzBackendEnabled().then(next => {
      if (active) setEnabled(next);
    });
    return () => { active = false; };
  }, []);

  if (enabled === null) return <AuthLoading />;
  return <AuthGate enabled={enabled}>{children}</AuthGate>;
}

/** Opens the notebook for the account this backend admitted, or the sign-in
 *  window when there is none. Without a backend the notebook is local. */
export function AuthGate({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return <WorkspaceProvider>{children}</WorkspaceProvider>;
  return (
    <JazzProvider
      serverUrl="/jazz"
      signedOut={<AuthScreen />}
      loading={<AuthLoading />}
      error={(state) => <AuthError state={state} />}
      autoAttachDevTools={false}
    >
      <JazzWorkspace>{children}</JazzWorkspace>
    </JazzProvider>
  );
}

/** The admitted half of the gate. The workspace mirrors the notebook through
 *  this account's client. */
function JazzWorkspace({ children }: { children: ReactNode }) {
  const client = useJazzClient();
  const session = useSession();
  const auth = useJazzAuth();
  const betterAuthSession = authClient.useSession();

  const accountId = session?.user ?? null;
  const email = betterAuthSession.data?.user.email ?? null;

  const signOut = useCallback(async () => {
    // Drop the cookie before Jazz asks who is signed in. Asking while the
    // cookie remains opens the same account again.
    await stopAppJazzSync();
    await authClient.signOut();
    await auth.reauthenticate();
  }, [auth]);

  const jazz = useMemo<WorkspaceJazz | undefined>(() => (
    accountId ? { db: client.db, accountId, email, signOut } : undefined
  ), [accountId, client.db, email, signOut]);

  if (!jazz) return null;
  return <WorkspaceProvider jazz={jazz}>{children}</WorkspaceProvider>;
}

/** Shown while this host's session is admitted and its client opens. */
function AuthLoading() {
  return (
    <main className="auth" aria-label="Loading Notes">
      <div className="auth__card auth__card--loading">
        <span className="spinner" aria-hidden="true" />
      </div>
    </main>
  );
}

function AuthError({ state }: { state: JazzAuthState }) {
  return (
    <main className="auth" aria-label="Notes could not sign in">
      <div className="auth__card">
        <h1>Notes</h1>
        <p className="auth__error" role="alert">{state.error?.message ?? "Jazz could not open this account."}</p>
        <button type="button" className="btn btn--primary auth__action" onClick={() => void state.retry()}>Try again</button>
      </div>
    </main>
  );
}
