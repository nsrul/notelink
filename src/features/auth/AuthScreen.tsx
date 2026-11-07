import { KeyRound, NotebookPen, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useJazzSession } from "jazz-tools/react";
import { RecoveryPhrase } from "jazz-tools/passphrase";
import { NEW_ACCOUNT_KEY } from "../../app/workspace-context";

/** What a failure means to someone who is not reading a stack trace. */
function failureMessage(reason: unknown): string {
  if (reason instanceof Error) {
    if (reason.message.toLowerCase().includes("checksum")) return "That recovery phrase is not valid. Check the words and try again.";
    if (reason.message.toLowerCase().includes("invalid")) return "That recovery phrase is not valid. Check the words and try again.";
    return reason.message;
  }
  return "Something went wrong. Try again.";
}

/** The window before a notebook opens: create a local-first Jazz account, or
 *  bring one back from its recovery phrase. Rendered by Jazz's own session as
 *  the signed-out view, so every action here is the session's. */
export function AuthScreen() {
  const { status, error, createLocalFirst, restoreLocalFirst, retry } = useJazzSession();
  const [mode, setMode] = useState<"choice" | "restore">("choice");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState<"create" | "restore" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Before a workspace is open there is no preference to read, so the sign-in
  // window follows the system's scheme on its own.
  useEffect(() => {
    const root = document.documentElement;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { root.dataset.theme = query.matches ? "dark" : "light"; };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const pending = busy !== null || status === "transitioning";

  const create = async () => {
    setFailure(null);
    setBusy("create");
    try {
      // The notebook offers its recovery phrase once it opens.
      try {
        window.localStorage.setItem(NEW_ACCOUNT_KEY, "1");
      } catch {
        // The phrase is still in the account menu.
      }
      await createLocalFirst();
    } catch (reason) {
      try {
        window.localStorage.removeItem(NEW_ACCOUNT_KEY);
      } catch {
        // Nothing to clean up.
      }
      setFailure(failureMessage(reason));
    } finally {
      setBusy(null);
    }
  };

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    const entered = phrase.trim();
    if (!entered) {
      setFailure("Enter your recovery phrase.");
      return;
    }
    setFailure(null);
    setBusy("restore");
    try {
      const normalized = entered.split(/\s+/).join(" ");
      const secret = normalized.startsWith("jazz-auth-v1:") ? normalized : RecoveryPhrase.toSecret(normalized);
      await restoreLocalFirst(secret);
    } catch (reason) {
      setFailure(failureMessage(reason));
    } finally {
      setBusy(null);
    }
  };

  const shownError = failure ?? error?.message ?? null;

  return (
    <main className="auth" aria-label="Sign in to Notes">
      <div className="auth__card">
        <span className="auth__mark" aria-hidden="true"><NotebookPen size={22} /></span>
        <h1>Notes</h1>
        <p className="auth__lede">Sign in to sync this notebook through Jazz Cloud.</p>

        {mode === "choice" ? (
          <>
            <button type="button" className="btn btn--primary auth__action" onClick={() => void create()} disabled={pending}>
              {busy === "create" ? <span className="spinner" aria-hidden="true" /> : <UserPlus size={16} />}
              {busy === "create" ? "Creating your account…" : "Create an account"}
            </button>
            <button type="button" className="btn btn--outline auth__action" onClick={() => { setMode("restore"); setFailure(null); }} disabled={pending}>
              <KeyRound size={16} />
              Sign in with a recovery phrase
            </button>
            <p className="auth__note">Your notebook stays in this browser. A Jazz account adds sync and a way back in on another device.</p>
          </>
        ) : (
          <form className="auth__form" onSubmit={(event) => void signIn(event)}>
            <label htmlFor="recovery-phrase">Recovery phrase</label>
            <textarea
              id="recovery-phrase"
              value={phrase}
              onChange={(event) => setPhrase(event.currentTarget.value)}
              placeholder="Enter the words you saved when you created the account"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={pending}
            />
            <div className="auth__form-actions">
              <button type="button" className="btn" onClick={() => { setMode("choice"); setFailure(null); }} disabled={pending}>
                Back
              </button>
              <button type="submit" className="btn btn--primary" disabled={pending || !phrase.trim()}>
                {busy === "restore" ? <span className="spinner" aria-hidden="true" /> : null}
                {busy === "restore" ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
        )}

        {status === "error" ? (
          <button type="button" className="btn btn--outline auth__action" onClick={() => void retry().catch(() => undefined)}>
            Try again
          </button>
        ) : null}

        {shownError ? <p className="auth__error" role="alert">{shownError}</p> : null}
      </div>
    </main>
  );
}
