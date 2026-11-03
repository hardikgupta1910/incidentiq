import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FlaskConical,
  LoaderCircle,
  Search,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import incidentService from "../services/incidentService";
import evaluationService from "../services/evaluationService";
import { getApiErrorMessage } from "../services/api";
import PrivacyControl from "../components/investigation/PrivacyControl";

const PROVIDERS = [
  {
    id: "ollama",
    label: "Ollama",
    description: "Local provider",
  },
  {
    id: "groq",
    label: "Groq",
    description: "Cloud provider",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Cloud provider",
  },
];

const PAGE_SIZE = 10;

function percentage(value) {
  return typeof value === "number"
    ? `${(value * 100).toFixed(1)}%`
    : "Not returned";
}

function ProviderResult({ item }) {
  const completed = item.status === "completed";

  const statusStyle =
    item.status === "completed"
      ? "border-success/25 bg-success/5 text-success"
      : item.status === "blocked"
        ? "border-warning/25 bg-warning/5 text-warning"
        : "border-critical/25 bg-critical/5 text-red-300";

  const providerLabel =
    PROVIDERS.find((provider) => provider.id === item.provider)?.label ||
    item.provider;

  const hypotheses = Array.isArray(item.result?.hypotheses)
    ? [...item.result.hypotheses].sort((a, b) => a.rank - b.rank)
    : [];

  const metrics = [
    [
      "Provider latency",
      typeof item.latency_ms === "number"
        ? `${item.latency_ms.toLocaleString()} ms`
        : "Not returned",
    ],
    ["Evidence coverage", percentage(item.evidence_coverage)],
    [
      "Heuristic diagnosis score",
      typeof item.diagnosis_quality === "number"
        ? `${item.diagnosis_quality.toFixed(2)} / 1`
        : "Not returned",
    ],
    ["Hypotheses", item.hypothesis_count ?? "Not returned"],
    [
      "Schema validation",
      item.schema_valid === true
        ? "Passed"
        : item.schema_valid === false
          ? "Failed"
          : "Not returned",
    ],
  ];

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h3 className="text-base font-semibold">{providerLabel}</h3>

        <span
          className={`rounded border px-2 py-1 text-xs ${statusStyle}`}
        >
          {item.status}
        </span>
      </header>

      {!completed ? (
        <div className="p-5">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
            {item.error || "This provider did not return a result."}
          </p>
        </div>
      ) : (
        <div className="p-5">
          <dl className="grid grid-cols-2 gap-5 border-b border-line pb-5">
            {metrics.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs leading-5 text-text-muted">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-sm font-medium">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 space-y-7">
            {hypotheses.length ? (
              hypotheses.map((hypothesis, index) => {
                const evidence = Array.isArray(hypothesis.evidence)
                  ? hypothesis.evidence
                  : [];

                const suggestedChecks = Array.isArray(
                  hypothesis.suggested_checks
                )
                  ? hypothesis.suggested_checks
                  : [];

                return (
                  <section key={`${hypothesis.rank}-${index}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-accent">
                        Hypothesis {hypothesis.rank}
                      </h4>

                      {typeof hypothesis.confidence === "number" && (
                        <span className="text-xs text-text-muted">
                          Model confidence:{" "}
                          {percentage(hypothesis.confidence)}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
                      {hypothesis.summary}
                    </p>

                    <h5 className="mt-4 text-xs font-medium text-text-muted">
                      Supporting evidence
                    </h5>

                    {evidence.length ? (
                      <ul className="mt-2 space-y-3">
                        {evidence.map((reference, evidenceIndex) => (
                          <li
                            key={evidenceIndex}
                            className="border-l-2 border-line pl-3"
                          >
                            <p className="break-words text-xs leading-5 text-text-muted">
                              {reference.source_type}

                              {reference.line_number != null &&
                                ` · Line ${reference.line_number}`}

                              {reference.source_file &&
                                ` · ${reference.source_file}`}

                              {reference.chunk_index != null &&
                                ` · Chunk ${reference.chunk_index}`}
                            </p>

                            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-text-secondary [overflow-wrap:anywhere]">
                              {reference.message}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-text-secondary">
                        No evidence references returned.
                      </p>
                    )}

                    <h5 className="mt-4 text-xs font-medium text-text-muted">
                      Suggested checks
                    </h5>

                    {suggestedChecks.length ? (
                      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-text-secondary">
                        {suggestedChecks.map((check, checkIndex) => (
                          <li
                            key={checkIndex}
                            className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                          >
                            {check}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-2 text-xs text-text-secondary">
                        No suggested checks returned.
                      </p>
                    )}
                  </section>
                );
              })
            ) : (
              <p className="text-sm text-text-secondary">
                No hypotheses returned.
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function ComparisonForm() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [incidents, setIncidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [listError, setListError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedProviders, setSelectedProviders] = useState([
    "ollama",
    "groq",
  ]);

  const [privacyPolicy, setPrivacyPolicy] = useState(null);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState(null);

  const inFlight = useRef(false);

  const allowedProviders = Array.isArray(
    privacyPolicy?.allowed_providers
  )
    ? privacyPolicy.allowed_providers
    : [];

  const effectiveProviders = selectedProviders.filter((provider) =>
    allowedProviders.includes(provider)
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const controller = new AbortController();

    setLoadingIncidents(true);
    setListError("");

    incidentService
      .list({
        search,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) return;

        setIncidents(
          Array.isArray(response.items) ? response.items : []
        );
        setTotal(response.total);

        const lastPage = Math.max(
          0,
          Math.ceil(response.total / PAGE_SIZE) - 1
        );

        if (page > lastPage) {
          setPage(lastPage);
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setListError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingIncidents(false);
        }
      });

    return () => controller.abort();
  }, [search, page, refresh]);

  function handleSearch(event) {
    event.preventDefault();

    setPage(0);
    setSearch(searchInput.trim());
    setRefresh((value) => value + 1);
  }

  function toggleProvider(providerId) {
    if (
      running ||
      !privacyPolicy ||
      !allowedProviders.includes(providerId)
    ) {
      return;
    }

    setSelectedProviders((previous) =>
      previous.includes(providerId)
        ? previous.filter((value) => value !== providerId)
        : [...previous, providerId]
    );
  }

  async function runEvaluation() {
    if (inFlight.current) return;

    setError("");

    if (!privacyPolicy) {
      setError(
        "Load the workspace privacy policy before running a comparison."
      );
      return;
    }

    if (!selectedIncident || effectiveProviders.length < 2) {
      setError(
        "Select an incident and at least two allowed providers."
      );
      return;
    }

    inFlight.current = true;
    setRunning(true);
    setEvaluation(null);

    const incidentSnapshot = selectedIncident;
    const providerSnapshot = [...effectiveProviders];

    try {
      const response = await evaluationService.run({
        incidentId: incidentSnapshot.id,
        providers: providerSnapshot,
      });

      if (
        response?.incident_id !== incidentSnapshot.id ||
        !Array.isArray(response.results)
      ) {
        setError(
          "The API returned an unexpected evaluation response."
        );
        return;
      }

      setEvaluation({
        ...response,
        incidentTitle: incidentSnapshot.title,
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }

  return (
    <>
      <PrivacyControl
        onPolicyChange={setPrivacyPolicy}
        disabled={running}
      />

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">
            Select an incident
          </h2>

          <form
            onSubmit={handleSearch}
            className="mt-4 flex gap-2"
          >
            <input
              type="search"
              aria-label="Search incidents for comparison"
              placeholder="Search title or filename"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              disabled={running}
              className="h-10 min-w-0 flex-1 rounded-md border border-line bg-canvas px-3 text-sm outline-none focus:border-accent disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={running}
              aria-label="Search incidents"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
            >
              <Search size={17} aria-hidden="true" />
            </button>
          </form>

          {selectedIncident && (
            <div className="mt-4 rounded-md border border-accent/20 bg-accent/5 px-3 py-2">
              <p className="break-words text-xs leading-6 text-accent">
                Selected: {selectedIncident.title}
              </p>

              <p className="break-all font-mono text-[11px] leading-5 text-text-muted">
                {selectedIncident.id}
              </p>
            </div>
          )}

          {loadingIncidents ? (
            <div
              role="status"
              className="mt-5 flex items-center gap-2 text-sm text-text-secondary"
            >
              <LoaderCircle
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
              Loading incidents…
            </div>
          ) : listError ? (
            <div className="mt-5">
              <p role="alert" className="text-sm text-red-300">
                {listError}
              </p>

              <button
                type="button"
                onClick={() =>
                  setRefresh((value) => value + 1)
                }
                disabled={running}
                className="mt-3 text-sm text-accent hover:underline disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <fieldset disabled={running} className="mt-4">
                <legend className="sr-only">
                  Available incidents
                </legend>

                <div className="technical-scroll max-h-64 divide-y divide-line overflow-y-auto">
                  {incidents.map((incident) => (
                    <label
                      key={incident.id}
                      className="flex cursor-pointer items-start gap-3 py-3"
                    >
                      <input
                        type="radio"
                        name="comparison-incident"
                        value={incident.id}
                        checked={
                          selectedIncident?.id === incident.id
                        }
                        onChange={() =>
                          setSelectedIncident(incident)
                        }
                        className="mt-1 accent-accent"
                      />

                      <span className="min-w-0">
                        <span className="block break-words text-sm">
                          {incident.title}
                        </span>

                        <span className="mt-1 block break-all text-xs text-text-muted">
                          {incident.source_filename} ·{" "}
                          {incident.status}
                        </span>

                        <span className="mt-1 block break-all font-mono text-[10px] text-text-muted">
                          {incident.id}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {!incidents.length && (
                <p className="mt-4 text-sm text-text-secondary">
                  No incidents match this search.
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs">
                <button
                  type="button"
                  disabled={running || page === 0}
                  onClick={() =>
                    setPage((value) => value - 1)
                  }
                  className="rounded px-2 py-1 text-text-secondary hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-text-muted">
                  Page {page + 1} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    running ||
                    (page + 1) * PAGE_SIZE >= total
                  }
                  onClick={() =>
                    setPage((value) => value + 1)
                  }
                  className="rounded px-2 py-1 text-text-secondary hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>

        <section className="min-w-0 rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">
            Choose providers
          </h2>

          <fieldset
            disabled={running}
            className="mt-4 space-y-3"
          >
            <legend className="sr-only">
              Providers to compare
            </legend>

            {PROVIDERS.map((provider) => {
              const unavailable =
                !privacyPolicy ||
                !allowedProviders.includes(provider.id);

              return (
                <label
                  key={provider.id}
                  className={[
                    "flex items-center gap-3 rounded-md border border-line p-3",
                    unavailable || running
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer hover:bg-elevated/50",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={effectiveProviders.includes(
                      provider.id
                    )}
                    disabled={running || unavailable}
                    onChange={() =>
                      toggleProvider(provider.id)
                    }
                    className="accent-accent disabled:cursor-not-allowed"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">
                      {provider.label}
                    </span>

                    <span className="text-xs text-text-muted">
                      {provider.description}
                    </span>
                  </span>

                  {privacyPolicy?.enabled &&
                    provider.id !== "ollama" && (
                      <span className="text-xs text-warning">
                        Privacy restricted
                      </span>
                    )}
                </label>
              );
            })}
          </fieldset>

          {!privacyPolicy && (
            <p className="mt-3 text-xs leading-6 text-text-muted">
              Provider selection is unavailable until the privacy
              policy loads.
            </p>
          )}

          {privacyPolicy?.enabled && (
            <p className="mt-3 text-xs leading-6 text-warning">
              Privacy mode allows only Ollama. Comparing two providers
              requires an administrator to permit external processing.
            </p>
          )}

          <p className="mt-4 text-xs leading-6 text-text-muted">
            Cloud evaluations may send incident logs and retrieved
            knowledge to an external provider. Backend privacy rules
            remain authoritative and may block a provider.
          </p>

          <button
            type="button"
            onClick={runEvaluation}
            disabled={
              running ||
              !privacyPolicy ||
              !selectedIncident ||
              effectiveProviders.length < 2
            }
            className="mt-5 flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <FlaskConical
                size={17}
                aria-hidden="true"
              />
            )}

            {running ? "Evaluating…" : "Run comparison"}
          </button>
        </section>
      </div>

      {running && (
        <p
          role="status"
          className="mt-6 rounded-md border border-line bg-surface p-4 text-sm leading-6 text-text-secondary"
        >
          Waiting for the backend evaluation. Providers are evaluated
          sequentially; individual results arrive together when the
          request finishes.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-critical/25 bg-critical/5 p-4 text-sm leading-6 text-red-300"
        >
          {error}
        </p>
      )}

      {evaluation && (
        <section className="mt-9">
          <h2 className="text-lg font-semibold">
            Comparison results
          </h2>

          <Link
            to={`/incidents/${evaluation.incident_id}`}
            className="mt-2 inline-block break-words text-sm text-accent hover:underline"
          >
            {evaluation.incidentTitle}
          </Link>

          <p className="mt-2 text-xs text-text-muted">
            Retrieved sources:{" "}
            {evaluation.retrieved_source_count ?? "Not returned"}
          </p>

          <details className="mt-5 rounded-md border border-line bg-sidebar p-4">
            <summary className="cursor-pointer text-sm text-text-secondary">
              How to interpret these metrics
            </summary>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-6 text-text-muted">
              <li>
                Provider latency measures the provider function call,
                excluding shared knowledge retrieval.
              </li>

              <li>
                Evidence coverage is the fraction of parsed log lines
                cited by valid line-number references. It does not
                establish that the citations support the diagnosis.
              </li>

              <li>
                The heuristic diagnosis score rewards hypotheses,
                evidence presence, and specific timeout/connection or
                HTTP 500 keyword matches. It is not diagnostic accuracy
                or a reliable overall ranking.
              </li>

              <li>
                Model confidence is self-reported, not independently
                verified. Schema validation indicates structure, not
                factual correctness.
              </li>

              <li>
                The API returns provider names, not exact model
                identifiers or token usage.
              </li>

              <li>
                Review suggested checks before executing commands or
                changing systems. These results are not automatically
                saved as comparison history.
              </li>
            </ul>
          </details>

          {evaluation.results.length ? (
            <div
              className={`mt-6 grid items-start gap-5 ${
                evaluation.results.length >= 3
                  ? "xl:grid-cols-3"
                  : evaluation.results.length === 2
                    ? "xl:grid-cols-2"
                    : "grid-cols-1"
              }`}
            >
              {evaluation.results.map((item, index) => (
                <ProviderResult
                  key={`${item.provider}-${index}`}
                  item={item}
                />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-lg border border-line bg-surface p-5 text-sm text-text-secondary">
              The backend returned no provider results.
            </p>
          )}
        </section>
      )}
    </>
  );
}

export default function ModelComparison() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <section className="max-w-xl rounded-lg border border-line bg-surface p-6">
        <ShieldCheck
          size={22}
          className="text-accent"
          aria-hidden="true"
        />

        <h1 className="mt-4 text-xl font-semibold">
          Administrator access required
        </h1>

        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Model evaluation is restricted to administrators. You can
          still investigate incidents from the Incidents workspace.
        </p>

        <Link
          to="/incidents"
          className="mt-5 inline-flex items-center gap-2 text-sm text-accent hover:underline"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to incidents
        </Link>
      </section>
    );
  }

  return (
    <div className="min-w-0">
      <Link
        to="/incidents"
        className="mb-5 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent hover:underline"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to incidents
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">
        Model Comparison
      </h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Compare provider-generated investigations using the same
        incident and shared retrieved context.
      </p>

      <ComparisonForm />
    </div>
  );
}