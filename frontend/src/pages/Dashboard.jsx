import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  FileUp,
  LoaderCircle,
} from "lucide-react";

import incidentService from "../services/incidentService";
import { getApiErrorMessage } from "../services/api";

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    Promise.all([
      incidentService.list({
        limit: 6,
        signal: controller.signal,
      }),
      incidentService.list({
        status: "created",
        limit: 1,
        signal: controller.signal,
      }),
      incidentService.list({
        status: "completed",
        limit: 1,
        signal: controller.signal,
      }),
    ])
      .then(([all, created, completed]) => {
        if (controller.signal.aborted) return;

        setData({
          total: all.total,
          created: created.total,
          completed: completed.total,
          recent: all.items,
        });
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

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Overview
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Monitor incident intake and saved investigation activity.
          </p>
        </div>

        <Link
          to="/incidents"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <FileUp size={17} aria-hidden="true" />
          Create incident
        </Link>
      </div>

      {loading ? (
        <div
          role="status"
          className="mt-8 flex items-center gap-3 text-sm text-text-secondary"
        >
          <LoaderCircle
            size={18}
            className="animate-spin"
            aria-hidden="true"
          />
          Loading overview…
        </div>
      ) : error ? (
        <div className="mt-8 rounded-lg border border-line bg-surface p-6">
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-4 rounded-md border border-line px-3 py-2 text-sm hover:bg-elevated"
          >
            Try again
          </button>
        </div>
      ) : data ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Total incidents", data.total, FileText],
              ["Awaiting investigation", data.created, FileUp],
              ["Completed investigations", data.completed, CheckCircle2],
            ].map(([label, value, Icon]) => (
              <section
                key={label}
                className="rounded-lg border border-line bg-surface p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xs text-text-secondary">{label}</h2>
                  <Icon
                    size={17}
                    className="text-text-muted"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight">
                  {value.toLocaleString()}
                </p>
              </section>
            ))}
          </div>

          <p className="mt-3 text-xs leading-5 text-text-muted">
            Investigation completion does not indicate incident resolution.
          </p>

          <section className="mt-9">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                Recent incidents
              </h2>
              <Link
                to="/incidents"
                className="inline-flex items-center gap-2 text-xs text-accent hover:underline"
              >
                View all
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
              {data.recent.length ? (
                <ul className="divide-y divide-line">
                  {data.recent.map((incident) => (
                    <li key={incident.id}>
                      <Link
                        to={`/incidents/${incident.id}`}
                        className="flex flex-col gap-3 p-5 transition hover:bg-elevated/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-medium">
                            {incident.title}
                          </h3>
                          <p className="mt-1 break-all text-xs text-text-muted">
                            {incident.source_filename}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs">
                          <span
                            className={
                              incident.status === "completed"
                                ? "text-success"
                                : "text-text-secondary"
                            }
                          >
                            {incident.status}
                          </span>
                          <span className="text-text-muted">
                            {formatDate(incident.created_at)}
                          </span>
                          <ArrowRight
                            size={15}
                            className="text-text-muted"
                            aria-hidden="true"
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8">
                  <h3 className="text-sm font-medium">
                    Your workspace is ready
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    Upload a log file to create your first incident.
                  </p>
                  <Link
                    to="/incidents"
                    className="mt-4 inline-block text-sm text-accent hover:underline"
                  >
                    Upload logs
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="mt-9 border-t border-line pt-6">
            <h2 className="text-sm font-semibold">
              Evidence-led investigation
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Open an incident to inspect parsed logs, compare AI
              hypotheses against supporting evidence, and review
              operational knowledge before taking action.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}