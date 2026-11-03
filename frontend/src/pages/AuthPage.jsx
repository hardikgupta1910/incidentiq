import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/api";

const inputClass =
  "h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm " +
  "text-text-primary outline-none placeholder:text-text-muted " +
  "focus:border-accent focus:ring-2 focus:ring-accent/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-text-primary"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          disabled={disabled}
          className={`${inputClass} pr-12`}
        />

        <button
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={visible}
          disabled={disabled}
          className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded text-text-secondary transition hover:bg-elevated hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {visible ? (
            <EyeOff size={17} aria-hidden="true" />
          ) : (
            <Eye size={17} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const { login, register, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const registered = location.state?.registered === true;

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    setError("");

    const cleanedUsername = username.trim();

    if (!cleanedUsername) {
      setError("Enter your username.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      if (isRegister) {
        await register({
          username: cleanedUsername,
          password,
        });

        navigate("/login", {
          replace: true,
          state: { registered: true },
        });
      } else {
        await login({
          username: cleanedUsername,
          password,
        });

        const from = location.state?.from;

        const destination =
          typeof from?.pathname === "string" &&
          from.pathname.startsWith("/") &&
          !from.pathname.startsWith("//") &&
          !["/login", "/register"].includes(from.pathname)
            ? `${from.pathname}${from.search || ""}${from.hash || ""}`
            : "/";

        navigate(destination, { replace: true });
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between border-r border-line bg-sidebar p-12 lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white">
            <Activity size={23} aria-hidden="true" />
          </div>

          <div>
            <p className="font-semibold tracking-tight">IncidentIQ</p>
            <p className="text-xs text-text-secondary">
              Engineering Intelligence
            </p>
          </div>
        </div>

        <div className="max-w-lg py-16">
          <p className="mb-5 text-xs font-medium uppercase tracking-widest text-accent">
            Incident investigation workspace
          </p>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            From technical evidence to clearer next steps.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-text-secondary">
            Investigate incidents with logs, retrieved operational
            knowledge, and AI-assisted analysis in one structured workspace.
          </p>

          <div className="mt-10 border-t border-line pt-6">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-accent"
                aria-hidden="true"
              />

              <p className="text-sm leading-6 text-text-secondary">
                AI output supports your investigation. Validate hypotheses
                against evidence before taking action.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-text-muted">
          Built for engineering incident investigation.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Activity
              size={26}
              className="text-accent"
              aria-hidden="true"
            />
            <span className="text-lg font-semibold">IncidentIQ</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {isRegister
              ? "Create an engineer account to access IncidentIQ."
              : "Sign in to your engineering workspace."}
          </p>

          {!isRegister && registered && (
            <div
              role="status"
              className="mt-6 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
            >
              Account created. Sign in with your username and password.
            </div>
          )}

          {error && (
            <div
              id="auth-error"
              role="alert"
              className="mt-6 rounded-md border border-critical/30 bg-critical/10 px-4 py-3 text-sm leading-6 text-red-300"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            aria-busy={submitting}
            aria-describedby={error ? "auth-error" : undefined}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium"
              >
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={submitting}
                placeholder="Your username"
                className={inputClass}
              />
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                isRegister ? "new-password" : "current-password"
              }
              disabled={submitting}
            />

            {isRegister && (
              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                disabled={submitting}
              />
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  {isRegister ? "Creating account…" : "Signing in…"}
                </>
              ) : (
                <>
                  {isRegister ? "Create account" : "Sign in"}
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            {isRegister
              ? "Already have an account? "
              : "New to IncidentIQ? "}

            <Link
              to={isRegister ? "/login" : "/register"}
              className="font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>

          <p className="mt-8 text-center text-xs leading-5 text-text-muted">
            This version keeps your session in memory. Refreshing the page
            will require you to sign in again.
          </p>
        </div>
      </section>
    </main>
  );
}