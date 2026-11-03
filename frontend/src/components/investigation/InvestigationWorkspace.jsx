import { useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Copy,
  FlaskConical,
  LoaderCircle,
  Play,
} from "lucide-react";
import investigationService from "../../services/investigationService";
import { getApiErrorMessage } from "../../services/api";

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        onBlur={() => {
          setCopied(false);
          setFailed(false);
        }}
        aria-label={copied ? "Copied" : label}
        title={copied ? "Copied" : label}
        className="flex h-8 items-center gap-2 rounded-md border border-line px-2 text-xs text-text-secondary hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        {copied ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>

      <span role="status" className="text-xs text-text-muted">
        {failed ? "Copy unavailable" : ""}
      </span>
    </div>
  );
}

function EvidenceItem({ evidence, events }) {
  const relatedLog =
    evidence.line_number != null
      ? events.find(
          (event) => event.line_number === evidence.line_number
        )
      : null;

  return (
    <li className="border-l-2 border-line pl-4">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
        <span>{evidence.source_type}</span>

        {evidence.source_file && (
          <span className="break-all font-mono">
            {evidence.source_file}
          </span>
        )}

        {evidence.line_number != null && (
          <span>Line {evidence.line_number}</span>
        )}

        {evidence.chunk_index != null && (
          <span>Chunk {evidence.chunk_index}</span>
        )}
      </div>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
        {evidence.message}
      </p>

      {relatedLog && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-accent">
            View referenced log event
          </summary>

          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-line bg-canvas p-3 text-xs leading-6 text-text-secondary [overflow-wrap:anywhere]">
            {relatedLog.message}
          </pre>
        </details>
      )}
    </li>
  );
}

function HypothesisPanel({ hypothesis, events }) {
  const evidence = Array.isArray(hypothesis.evidence)
    ? hypothesis.evidence
    : [];

  const checks = Array.isArray(hypothesis.suggested_checks)
    ? hypothesis.suggested_checks
    : [];

  const confidence = hypothesis.confidence;

  return (
    <article className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-accent">
          Hypothesis {hypothesis.rank}
        </span>

        {typeof confidence === "number" && (
          <span
            title="Model-reported confidence, not an independently verified probability."
            className="rounded-md border border-line px-2 py-1 text-xs text-text-secondary"
          >
            Model confidence: {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      <h3 className="mt-4 whitespace-pre-wrap break-words text-base font-medium leading-7">
        {hypothesis.summary}
      </h3>

      <section className="mt-6">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Supporting evidence
        </h4>

        {evidence.length ? (
          <ul className="mt-4 space-y-5">
            {evidence.map((item, index) => (
              <EvidenceItem
                key={index}
                evidence={item}
                events={events}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            No supporting evidence was returned for this hypothesis.
          </p>
        )}
      </section>

      <section className="mt-6 border-t border-line pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Suggested checks
        </h4>

        {checks.length ? (
          <ol className="mt-4 space-y-4">
            {checks.map((check, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line font-mono text-xs text-text-muted">
                  {index + 1}
                </span>

                <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
                  {check}
                </p>

                <CopyButton
                  text={check}
                  label={`Copy suggested check ${index + 1}`}
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            No suggested checks were returned.
          </p>
        )}
      </section>
    </article>
  );
}

export default function InvestigationWorkspace({ incident }) {
  const [result, setResult] = useState(incident.investigation || null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const requestInFlight = useRef(false);

  async function runInvestigation() {
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    setRunning(true);
    setError("");

    try {
      const response =
        await investigationService.investigate(incident.id);

      if (
        response?.incident_id !== incident.id ||
        !Array.isArray(response?.hypotheses)
      ) {
        setError(
          "The API returned an unexpected investigation response. Reopen the incident to check its saved result."
        );
        return;
      }

      setResult(response);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      requestInFlight.current = false;
      setRunning(false);
    }
  }

  const hypotheses = Array.isArray(result?.hypotheses)
    ? [...result.hypotheses].sort((a, b) => a.rank - b.rank)
    : [];

  const sources = Array.isArray(result?.retrieved_sources)
    ? result.retrieved_sources
    : [];

  const events = Array.isArray(incident.events)
    ? incident.events
    : [];

  return (
    <section
      aria-labelledby="investigation-heading"
      aria-busy={running}
      className="mt-9 border-t border-line pt-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical
              size={20}
              className="text-accent"
              aria-hidden="true"
            />

            <h2
              id="investigation-heading"
              className="text-xl font-semibold tracking-tight"
            >
              AI investigation
            </h2>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Review possible causes against log evidence and retrieved
            operational knowledge.
          </p>
        </div>

        <button
          type="button"
          onClick={runInvestigation}
          disabled={running}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Play size={16} aria-hidden="true" />
          )}

          {running
            ? "Investigating…"
            : result
              ? "Run again"
              : "Investigate with AI"}
        </button>
      </div>

      {running && (
        <div
          role="status"
          className="mt-5 rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm leading-6 text-text-secondary"
        >
          Investigation requested. Waiting for the backend to return
          its analysis.
          {result && " The previous result remains visible below."}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-md border border-critical/30 bg-critical/5 px-4 py-3 text-sm leading-6 text-red-300"
        >
          {error}
        </div>
      )}

      {!result && !running && (
        <div className="mt-6 rounded-lg border border-dashed border-line p-6">
          <h3 className="text-sm font-medium">
            No saved investigation
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
            Start an investigation to generate ranked hypotheses,
            evidence references, and suggested diagnostic checks.
          </p>
        </div>
      )}

      {result && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-xs text-text-secondary">
            <span>
              Backend status:{" "}
              <span className="text-text-primary">
                {result.status}
              </span>
            </span>

            <span>{hypotheses.length} hypotheses</span>
            <span>{sources.length} retrieved sources</span>
          </div>

          <p className="mt-4 text-xs leading-6 text-text-muted">
            AI-generated hypotheses are not verified findings.
            Confidence is model-reported, not an independently
            calibrated probability. Validate suggested checks before
            executing commands or changing systems.
          </p>

          <div className="mt-6 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
              {hypotheses.length ? (
                hypotheses.map((hypothesis, index) => (
                  <HypothesisPanel
                    key={`${hypothesis.rank}-${index}`}
                    hypothesis={hypothesis}
                    events={events}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-line bg-surface p-6 text-sm text-text-secondary">
                  The backend returned no hypotheses.
                </div>
              )}
            </div>

            <aside
              aria-label="Retrieved knowledge"
              className="min-w-0 rounded-lg border border-line bg-surface p-5"
            >
              <div className="flex items-center gap-2">
                <BookOpen
                  size={17}
                  className="text-accent"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold">
                  Retrieved knowledge
                </h3>
              </div>

              <p className="mt-3 text-xs leading-6 text-text-muted">
                Retrieval scores are shown as returned by the backend.
                They are not confidence percentages.
              </p>

              {sources.length ? (
                <div className="mt-5 divide-y divide-line">
                  {sources.map((source, index) => (
                    <details
                      key={`${source.source_file}-${source.chunk_index}-${index}`}
                      className="py-4 first:pt-0"
                    >
                      <summary className="cursor-pointer break-words text-sm font-medium text-text-primary">
                        {source.source_file}
                      </summary>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
                        <span>Chunk {source.chunk_index}</span>
                        <span>
                          Score:{" "}
                          {typeof source.score === "number"
                            ? source.score.toFixed(4)
                            : "Not available"}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-text-secondary [overflow-wrap:anywhere]">
                        {source.text}
                      </p>

                      <div className="mt-3">
                        <CopyButton
                          text={source.text}
                          label="Copy retrieved passage"
                        />
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-text-secondary">
                  No retrieved sources were returned for this
                  investigation.
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}