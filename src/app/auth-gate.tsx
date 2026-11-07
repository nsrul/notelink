import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { betterAuth } from "jazz-tools/client";
import { JazzProvider, useJazzAuth, useJazzClient, useSession, type JazzAuthState } from "jazz-tools/react";
import { AuthScreen } from "../features/auth/AuthScreen";
import { authClient } from "../platform/auth-client";
import { loadJazzClientConfig, type JazzClientConfig } from "../platform/jazz-config";
import { stopAppJazzSync } from "../platform/jazz-sync";
import { WorkspaceProvider, type WorkspaceJazz } from "./workspace-context";

/** Asks the auth server which Jazz server to open, then admits the Better Auth
 *  session. Without either, the notebook stays in this browser. */
export function JazzBootstrap({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [config, setConfig] = useState<JazzClientConfig | null>(null);

  useEffect(() => {
    let active = true;
    void loadJazzClientConfig().then(next => {
      if (!active) return;
      setConfig(next);
      setPhase("ready");
    });
    return () => { active = false; };
  }, []);

  if (phase === "loading") return <AuthLoading />;
  return <AuthGate config={config}>{children}</AuthGate>;
}

/** Opens the notebook for the Better Auth user Jazz admitted, or the sign-in
 *  window when there is none. Without Jazz settings the notebook is local and
 *  opens directly. */
export function AuthGate({ config, children }: { config: JazzClientConfig | null; children: ReactNode }) {
  if (!config) return <WorkspaceProvider>{children}</WorkspaceProvider>;
  return (
    <JazzProvider
      appId={config.appId}
      serverUrl={config.serverUrl}
      env={config.env}
      auth={betterAuth(authClient)}
      signedOut={<AuthScreen />}
      loading={<AuthLoading />}
      error={(state) => <AuthError state={state} />}
      autoAttachDevTools={false}
    >
      <JazzWorkspace>{children}</JazzWorkspace>
    </JazzProvider>
  );
}

/** The admitted half of the gate: Jazz's client and account, handed to the
 *  workspace so its notebook mirrors through them. */
function JazzWorkspace({ children }: { children: ReactNode }) {
  const client = useJazzClient();
  const session = useSession();
  const auth = useJazzAuth();
  const betterAuthSession = authClient.useSession();

  const accountId = session?.user.account ?? null;
  const email = betterAuthSession.data?.user.email ?? null;

  const signOut = useCallback(async () => {
    // Let go of the account's client before Jazz retires it, so no sync is
    // left subscribed to a database that is closing.
    await stopAppJazzSync();
    await auth.logout();
  }, [auth]);

  const jazz = useMemo<WorkspaceJazz | undefined>(() => (
    accountId ? { db: client.db, accountId, email, signOut } : undefined
  ), [accountId, client.db, email, signOut]);

  // The provider renders `signedOut` until an account is admitted.
  if (!jazz) return null;
  return <WorkspaceProvider jazz={jazz}>{children}</WorkspaceProvider>;
}

/** Shown while Jazz hydrates the Better Auth session and opens its client. */
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
