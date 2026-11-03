import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import incidentService from "../services/incidentService";
import { getApiErrorMessage } from "../services/api";
import InvestigationWorkspace from "../components/investigation/InvestigationWorkspace";


function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

const severityStyles = {
  INFO: "text-info",
  WARNING: "text-warning",
  ERROR: "text-red-300",
  CRITICAL: "font-semibold text-critical",
};

export default function IncidentDetails() {
  const { incidentId } = useParams();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");
    setIncident(null);

    incidentService
      .getById(incidentId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setIncident(data);
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
  }, [incidentId, attempt]);

  if (loading) {
    return (
      <div role="status" className="flex items-center gap-3 py-16 text-sm text-text-secondary">
        <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
        Loading incident…
      </div>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-line bg-surface p-6">
        <h1 className="text-lg font-semibold">Unable to load incident</h1>
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="mt-5 rounded-md border border-line px-4 py-2 text-sm hover:bg-elevated"
        >
          Try again
        </button>
      </section>
    );
  }

  if (!incident) return null;

  const query = search.trim().toLowerCase();
  const events = Array.isArray(incident.events) ? incident.events : [];

  const filteredEvents = events.filter((event) =>
    [
      event.line_number,
      event.timestamp,
      event.severity,
      event.service,
      event.message,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );

  const details = [
    ["Status", incident.status],
    ["Created", formatDate(incident.created_at)],
    ["Source file", incident.source_filename],
    ["Parsed log lines", incident.total_log_lines],
    ["Errors and critical events", incident.error_count],
  ];

  return (
    <div className="min-w-0">
      <Link
        to="/incidents"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Incidents
      </Link>

      <h1 className="mt-5 break-words text-2xl font-semibold tracking-tight">
        {incident.title}
      </h1>

      <p className="mt-3 break-all font-mono text-xs text-text-muted">
        {incident.id}
      </p>

      <dl className="mt-7 grid gap-5 border-y border-line py-5 sm:grid-cols-2 xl:grid-cols-5">
        {details.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd className="mt-2 break-words text-sm">
              {value ?? "Not available"}
            </dd>
          </div>
        ))}
      </dl>

      <InvestigationWorkspace
         key={incident.id}
        incident={incident}
        />

      <section className="mt-8 min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Log evidence</h2>
            <p className="mt-1 text-xs text-text-muted">
              {filteredEvents.length} of {events.length} events
            </p>
          </div>

          <input
            type="search"
            aria-label="Search log events"
            placeholder="Search messages, services, or severity"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent sm:max-w-sm"
          />
        </div>

        <div className="technical-scroll mt-5 max-h-[560px] overflow-auto rounded-lg border border-line bg-sidebar">
          {filteredEvents.length === 0 ? (
            <p className="p-6 text-sm text-text-secondary">
              {events.length
                ? "No log events match your search."
                : "This incident contains no parsed log events."}
            </p>
          ) : (
            <div className="divide-y divide-line">
              {filteredEvents.map((event, index) => (
                <div
                  key={`${event.line_number}-${index}`}
                  className="grid gap-2 px-4 py-3 font-mono text-xs leading-6 sm:grid-cols-[48px_1fr]"
                >
                  <span className="text-text-muted">
                    {event.line_number}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-x-3 text-text-muted">
                      <span
                        className={
                          severityStyles[event.severity] ||
                          "text-text-secondary"
                        }
                      >
                        {event.severity || "INFO"}
                      </span>

                      {event.service && <span>{event.service}</span>}

                      {event.timestamp && (
                        <span>{formatDate(event.timestamp)}</span>
                      )}
                    </div>

                    <p className="whitespace-pre-wrap break-words text-text-primary [overflow-wrap:anywhere]">
                      {event.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}