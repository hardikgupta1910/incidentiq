import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, RefreshCw, Search } from "lucide-react";
import incidentService from "../../services/incidentService";
import { getApiErrorMessage } from "../../services/api";

const PAGE_SIZE = 10;

function formatDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

function StatusBadge({ status }) {
  const style =
    status === "completed"
      ? "border-success/25 bg-success/10 text-success"
      : "border-line bg-elevated text-text-secondary";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded border px-2 py-1 text-xs ${style}`}
    >
      {status}
    </span>
  );
}

export default function IncidentBrowser() {
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    page: 0,
  });

  const [data, setData] = useState({
    items: [],
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    incidentService
      .list({
        search: filters.search,
        status: filters.status,
        limit: PAGE_SIZE,
        offset: filters.page * PAGE_SIZE,
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) return;

        setData(response);

        const lastPage = Math.max(
          0,
          Math.ceil(response.total / PAGE_SIZE) - 1
        );

        if (filters.page > lastPage) {
          setFilters((previous) => ({
            ...previous,
            page: lastPage,
          }));
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters, refresh]);

  function handleSearch(event) {
    event.preventDefault();

    setFilters((previous) => ({
      ...previous,
      search: searchInput.trim(),
      page: 0,
    }));
  }

  const totalPages = Math.max(
    1,
    Math.ceil(data.total / PAGE_SIZE)
  );

  const firstItem = data.total
    ? filters.page * PAGE_SIZE + 1
    : 0;

  const lastItem = Math.min(
    (filters.page + 1) * PAGE_SIZE,
    data.total
  );

  return (
    <section aria-labelledby="incident-browser-heading" className="mt-9">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="incident-browser-heading"
            className="text-base font-semibold"
          >
            Saved incidents
          </h2>

          <p className="mt-1 text-xs text-text-muted">
            Shared workspace · Newest first
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefresh((value) => value + 1)}
          disabled={loading}
          className="flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs text-text-secondary hover:bg-elevated disabled:opacity-50"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row">
        <form
          onSubmit={handleSearch}
          className="flex min-w-0 flex-1 gap-2"
        >
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 text-text-muted"
            />

            <input
              type="search"
              aria-label="Search saved incidents"
              placeholder="Search title, filename, or ID"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            className="h-10 rounded-md border border-line bg-elevated px-4 text-sm hover:border-accent"
          >
            Search
          </button>
        </form>

        <select
          aria-label="Filter by incident status"
          value={filters.status}
          onChange={(event) => {
            const status = event.target.value;

            setFilters((previous) => ({
              ...previous,
              status,
              page: 0,
            }));
          }}
          className="h-10 rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
        >
          <option value="">All statuses</option>
          <option value="created">Created</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div
        aria-busy={loading}
        className="mt-4 overflow-hidden rounded-lg border border-line"
      >
        {loading ? (
          <div
            role="status"
            className="flex items-center gap-3 p-8 text-sm text-text-secondary"
          >
            <LoaderCircle
              size={18}
              className="animate-spin"
              aria-hidden="true"
            />
            Loading incidents…
          </div>
        ) : error ? (
          <div className="p-6">
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
              className="mt-4 rounded-md border border-line px-3 py-2 text-sm hover:bg-elevated"
            >
              Try again
            </button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-8">
            <h3 className="text-sm font-medium">
              No incidents found
            </h3>

            <p className="mt-2 text-sm text-text-secondary">
              {filters.search || filters.status
                ? "Try another search or change the status filter."
                : "Upload a log file above to create your first incident."}
            </p>
          </div>
        ) : (
          <>
            <div className="technical-scroll overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Saved incidents ordered by creation time, newest first
                </caption>

                <thead className="border-b border-line bg-sidebar text-xs text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Incident
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Created
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Lines
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Errors
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      <span className="sr-only">Open incident</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-line bg-surface">
                  {data.items.map((incident) => (
                    <tr
                      key={incident.id}
                      className="hover:bg-elevated/50"
                    >
                      <td className="min-w-[230px] max-w-sm px-4 py-4">
                        <Link
                          to={`/incidents/${incident.id}`}
                          className="break-words font-medium text-text-primary hover:text-accent hover:underline"
                        >
                          {incident.title}
                        </Link>

                        <p className="mt-1 break-all text-xs text-text-muted">
                          {incident.source_filename}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={incident.status} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-xs text-text-secondary">
                        {formatDate(incident.created_at)}
                      </td>

                      <td className="px-4 py-4 text-right font-mono text-xs text-text-secondary">
                        {incident.total_log_lines}
                      </td>

                      <td
                        className={`px-4 py-4 text-right font-mono text-xs ${
                          incident.error_count > 0
                            ? "text-red-300"
                            : "text-text-secondary"
                        }`}
                      >
                        {incident.error_count}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/incidents/${incident.id}`}
                          aria-label={`Open ${incident.title}`}
                          className="text-xs text-accent hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sidebar px-4 py-3">
              <p className="text-xs text-text-muted">
                {firstItem}–{lastItem} of {data.total}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={filters.page === 0}
                  onClick={() =>
                    setFilters((previous) => ({
                      ...previous,
                      page: previous.page - 1,
                    }))
                  }
                  className="rounded border border-line px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-xs text-text-secondary">
                  {filters.page + 1} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={filters.page + 1 >= totalPages}
                  onClick={() =>
                    setFilters((previous) => ({
                      ...previous,
                      page: previous.page + 1,
                    }))
                  }
                  className="rounded border border-line px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}