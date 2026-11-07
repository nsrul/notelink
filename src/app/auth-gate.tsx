import { useCallback, useMemo, type ReactNode } from "react";
import { exportLocalFirstSecret, type JazzSessionConfig } from "jazz-tools";
import { RecoveryPhrase } from "jazz-tools/passphrase";
import { JazzSessionProvider, useJazzClient, useJazzSession } from "jazz-tools/react";
import { AuthScreen } from "../features/auth/AuthScreen";
import { stopAppJazzSync } from "../platform/jazz-sync";
import { WorkspaceProvider, type WorkspaceJazz } from "./workspace-context";

/** Opens the notebook for the account Jazz's session selected, or the sign-in
 *  window when there is none. Without Jazz settings the notebook is local and
 *  opens directly. */
export function AuthGate({ config, children }: { config: JazzSessionConfig | null; children: ReactNode }) {
  if (!config) return <WorkspaceProvider>{children}</WorkspaceProvider>;
  return (
    <JazzSessionProvider config={config} fallback={<AuthScreen />} autoAttachDevTools={false}>
      <JazzWorkspace>{children}</JazzWorkspace>
    </JazzSessionProvider>
  );
}

/** The signed-in half of the gate: Jazz's client and account, handed to the
 *  workspace so its notebook mirrors through them. */
function JazzWorkspace({ children }: { children: ReactNode }) {
  const client = useJazzClient();
  const session = useJazzSession();
  const account = session.account;

  const signOut = useCallback(async () => {
    // Let go of the account's client before Jazz retires it, so no sync is
    // left subscribed to a database that is closing.
    await stopAppJazzSync();
    await session.logout();
  }, [session]);

  const recoveryPhrase = useCallback(() => {
    if (!account) return null;
    try {
      return RecoveryPhrase.fromSecret(exportLocalFirstSecret(account));
    } catch {
      return null;
    }
  }, [account]);

  const jazz = useMemo<WorkspaceJazz | undefined>(() => (
    account ? { db: client.db, account, signOut, recoveryPhrase } : undefined
  ), [account, client.db, recoveryPhrase, signOut]);

  if (!jazz) return <AuthScreen />;
  return <WorkspaceProvider jazz={jazz}>{children}</WorkspaceProvider>;
}
