import { Activity, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function WorkspaceHome() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-sidebar">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
              <Activity size={21} aria-hidden="true" />
            </div>

            <div>
              <p className="text-sm font-semibold">IncidentIQ</p>
              <p className="text-xs text-text-secondary">
                Engineering Intelligence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm text-text-secondary transition hover:bg-elevated hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          Workspace
        </p>

        <h1 className="mt-3 break-words text-2xl font-semibold tracking-tight">
          Welcome, {user.username}
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
        Investigate incidents, review technical evidence, and identify
        actionable next steps.
        </p>

        <section
          aria-labelledby="account-heading"
          className="mt-8 max-w-xl rounded-lg border border-line bg-surface p-6"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={18}
              className="text-accent"
              aria-hidden="true"
            />
            <h2 id="account-heading" className="text-sm font-semibold">
              Account details
            </h2>
          </div>

          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-text-secondary">Username</dt>
              <dd className="break-all text-right">{user.username}</dd>
            </div>

            <div className="flex justify-between gap-6">
              <dt className="text-text-secondary">Role</dt>
              <dd>{user.role}</dd>
            </div>

            <div className="flex justify-between gap-6">
              <dt className="shrink-0 text-text-secondary">User ID</dt>
              <dd className="break-all text-right font-mono text-xs">
                {user.id}
              </dd>
            </div>
          </dl>

          {isAdmin && (
            <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-text-secondary">
              Your account has the admin role. Backend permissions remain
              authoritative for all protected operations.
            </p>
          )}
        </section>

       
      </main>
    </div>
  );
}