import { KeyRound, NotebookPen, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "../../platform/auth-client";

type Mode = "signin" | "signup";

/** The window before a notebook opens: sign in with Better Auth, or make an
 *  account. Jazz follows the Better Auth session and opens the workspace once
 *  its account is admitted. */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setFailure(null);
    setBusy(true);
    try {
      const result = mode === "signup"
        ? await authClient.signUp.email({
            email: email.trim(),
            password,
            name: name.trim() || email.trim().split("@")[0] || "Notes",
          })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) setFailure(result.error.message ?? "Sign-in failed.");
      // On success the Jazz provider follows the Better Auth session and swaps
      // this screen for the notebook.
    } catch (reason) {
      setFailure(reason instanceof Error ? reason.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(current => current === "signin" ? "signup" : "signin");
    setFailure(null);
  };

  return (
    <main className="auth" aria-label="Sign in to Notes">
      <div className="auth__card">
        <span className="auth__mark" aria-hidden="true"><NotebookPen size={18} /></span>
        <h1>Notes</h1>
        <p className="auth__lede">
          {mode === "signup" ? "Create an account to sync this notebook." : "Sign in to sync this notebook."}
        </p>

        <form className="auth__form" onSubmit={(event) => void submit(event)}>
          {mode === "signup" ? (
            <>
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="Your name"
                autoComplete="name"
                disabled={busy}
              />
            </>
          ) : null}
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            disabled={busy}
          />
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={mode === "signup" ? 8 : undefined}
            disabled={busy}
          />
          <button type="submit" className="btn btn--primary auth__action" disabled={busy || !email.trim() || !password}>
            {busy ? <span className="spinner" aria-hidden="true" /> : mode === "signup" ? <UserPlus size={15} /> : <KeyRound size={15} />}
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button type="button" className="auth__switch" onClick={switchMode} disabled={busy}>
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>

        <p className="auth__note">Your notebook stays in this browser. Signing in adds sync and a way back in on another device.</p>
        {failure ? <p className="auth__error" role="alert">{failure}</p> : null}
      </div>
    </main>
  );
}
