import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import { getApiErrorMessage } from "../services/api";

function UserDirectory() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    authService
      .getUsers({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setUsers(data);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  const query = search.trim().toLowerCase();

  const filtered = users.filter((user) =>
    `${user.username} ${user.role} ${user.id}`
      .toLowerCase()
      .includes(query)
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-2 text-sm text-text-secondary">
        View registered workspace accounts and assigned roles.
      </p>

      <input
        type="search"
        aria-label="Search users"
        placeholder="Search username, role, or ID"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mt-7 h-10 w-full max-w-md rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
      />

      {loading ? (
        <div
          role="status"
          className="mt-6 flex items-center gap-2 text-sm text-text-secondary"
        >
          <LoaderCircle
            size={17}
            className="animate-spin"
            aria-hidden="true"
          />
          Loading users…
        </div>
      ) : error ? (
        <div className="mt-6">
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="technical-scroll mt-5 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Registered workspace users
            </caption>
            <thead className="border-b border-line bg-sidebar text-xs text-text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Username
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  User ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="break-all px-4 py-4">
                    {user.username}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded border border-line px-2 py-1 text-xs text-text-secondary">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-text-muted">
                    {user.id}
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-text-secondary"
                  >
                    No matching users.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Users() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <section className="rounded-lg border border-line bg-surface p-6">
        <h1 className="text-lg font-semibold">
          Administrator access required
        </h1>
        <Link
          to="/incidents"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          Back to incidents
        </Link>
      </section>
    );
  }

  return <UserDirectory />;
}