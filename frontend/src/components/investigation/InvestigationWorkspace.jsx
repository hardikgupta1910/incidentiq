import { useMemo, useState } from "react";
import { BookOpen, Check, Copy, Download, FlaskConical, LoaderCircle, Play } from "lucide-react";
import investigationService, {
  normalizeApiData,
} from "../../services/investigationService";

import { getApiErrorMessage } from "../../services/api";

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        onBlur={() => setCopied(false)}
        aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
        title={copied ? "Copied" : `Copy ${label}`}
        className="flex h-8 items-center gap-2 rounded-md border border-line px-2 text-xs text-text-secondary hover:bg-elevated"
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </button>
      {failed && <span className="text-xs text-red-300">Copy unavailable</span>}
    </div>
  );
}

function EvidenceItem({ evidence, events }) {
  const relatedLog =
    evidence.lineNumber !== null && evidence.lineNumber !== undefined
      ? events.find((event) => event.lineNumber === evidence.lineNumber)
      : null;

  return (
    <li className="border-l-2 border-line pl-4">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
        <span>{evidence.sourceType}</span>
        {evidence.sourceFile && <span className="break-all font-mono">{evidence.sourceFile}</span>}
        {evidence.lineNumber !== null && evidence.lineNumber !== undefined && (
          <span>Line {evidence.lineNumber}</span>
        )}
        {evidence.chunkIndex !== null && evidence.chunkIndex !== undefined && (
          <span>Chunk {evidence.chunkIndex}</span>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
        {evidence.message}
      </p>

      {relatedLog && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-accent">View referenced log event</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-line bg-canvas p-3 text-xs leading-6 text-text-secondary">
            {relatedLog.message}
          </pre>
        </details>
      )}
    </li>
  );
}

function HypothesisPanel({ hypothesis, events }) {
  const evidence = Array.isArray(hypothesis.evidence) ? hypothesis.evidence : [];
  const checks = Array.isArray(hypothesis.suggestedChecks) ? hypothesis.suggestedChecks : [];
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
            Model confidence {(confidence * 100).toFixed(0)}%
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
              <EvidenceItem key={index} evidence={item} events={events} />
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
                <CopyButton text={check} label={`suggested check ${index + 1}`} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">No suggested checks were returned.</p>
        )}
      </section>
    </article>
  );
}

function getAnalysisSourceLabel(result) {
  if (result?.analysisSource === "local_ai") return "Local AI analysis";
  if (result?.analysisSource === "rule_based_fallback") return "Rule-based fallback";
  return "Unknown / legacy result";
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

function buildReportMarkdown(incident, result) {
  const events = Array.isArray(incident?.events) ? incident.events : [];
  const hypotheses = Array.isArray(result?.hypotheses)
    ? [...result.hypotheses].sort((a, b) => a.rank - b.rank)
    : [];
  const sources = Array.isArray(result?.retrievedSources) ? result.retrievedSources : [];

  const lines = [
    "# Incident Investigation Report",
    "",
    `## ${incident.title}`,
    "",
    `- Incident ID: \`${incident.id}\``,
    `- Created: ${formatDateTime(incident.createdAt)}`,
    `- Source file: ${incident.sourceFilename || "Not available"}`,
    `- Incident status: ${incident.status || "Not available"}`,
    `- Investigation status: ${result?.status || "Not available"}`,
    `- Analysis source: ${getAnalysisSourceLabel(result)}`,
    `- Parsed log lines: ${incident.totalLogLines ?? events.length}`,
    `- Errors and critical events: ${incident.errorCount ?? 0}`,
    `- Hypotheses: ${hypotheses.length}`,
    `- Retrieved knowledge passages: ${sources.length}`,
    "",
    "## Important limitations",
    "",
    "- This report contains AI-assisted analysis, not independently verified findings.",
    "- Confidence values are model-reported heuristics, not measured probabilities.",
    "- Retrieved runbook passages provide operational guidance; they do not prove an incident cause.",
    "- Validate every suggested check before executing commands or changing production systems.",
    "",
    "## Ranked hypotheses",
    "",
  ];

  if (!hypotheses.length) {
    lines.push("No investigation hypotheses were available when this report was generated.");
  }

  hypotheses.forEach((hypothesis) => {
    const evidence = Array.isArray(hypothesis.evidence) ? hypothesis.evidence : [];
    const checks = Array.isArray(hypothesis.suggestedChecks) ? hypothesis.suggestedChecks : [];

    lines.push(
      `### Hypothesis ${hypothesis.rank}`,
      "",
      hypothesis.summary || "No summary was returned.",
      ""
    );

    if (typeof hypothesis.confidence === "number") {
      lines.push(`Model-reported confidence: ${(hypothesis.confidence * 100).toFixed(0)}%`, "");
    }

    lines.push("**Supporting evidence**", "");

    if (evidence.length) {
      evidence.forEach((item) => {
        const location = [
          item.sourceType,
          item.sourceFile,
          item.lineNumber !== null && item.lineNumber !== undefined ? `line ${item.lineNumber}` : "",
          item.chunkIndex !== null && item.chunkIndex !== undefined ? `chunk ${item.chunkIndex}` : "",
        ]
          .filter(Boolean)
          .join(" · ");

        lines.push(`- ${location ? `${location}: ` : ""}${item.message}`);
      });
    } else {
      lines.push("No supporting evidence was returned.");
    }

    lines.push("", "**Suggested checks**", "");

    if (checks.length) {
      checks.forEach((check, index) => lines.push(`${index + 1}. ${check}`));
    } else {
      lines.push("No suggested checks were returned.");
    }

    lines.push("");
  });

  lines.push("## Retrieved knowledge", "");

  if (!sources.length) {
    lines.push("No retrieved knowledge passages were available for this investigation.");
  } else {
    sources.forEach((source, index) => {
      lines.push(
        `### ${index + 1}. ${source.sourceFile || "Unknown source"}`,
        "",
        `Chunk: ${source.chunkIndex ?? "Not available"}  `,
        `Retrieval score: ${typeof source.score === "number" ? source.score.toFixed(4) : "Not available"}`,
        "",
        "```text",
        source.text || "No passage text was returned.",
        "```",
        ""
      );
    });
  }

  lines.push(
    "## Exported from IncidentIQ",
    "",
    `Report generated: ${new Date().toLocaleString()}`,
    "",
    "This export contains the investigation result stored in the application at export time."
  );

  return lines.join("\n");
}

function safeFileName(value) {
  return (value || "incident-report")
    .replace(/[^a-z0-9-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "incident-report";
}

export default function InvestigationWorkspace({ incident: rawIncident }) {
  const incident = normalizeApiData(rawIncident);
  const [result, setResult] = useState(incident.investigation || null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");

  const hypotheses = useMemo(
    () =>
      Array.isArray(result?.hypotheses)
        ? [...result.hypotheses].sort((a, b) => a.rank - b.rank)
        : [],
    [result]
  );
  const sources = Array.isArray(result?.retrievedSources) ? result.retrievedSources : [];
  const events = Array.isArray(incident?.events) ? incident.events : [];

  async function runInvestigation() {
    setRunning(true);
    setError("");

    try {
      const response = await investigationService.investigate(incident.id);

      if (response?.incidentId !== incident.id || !Array.isArray(response?.hypotheses)) {
        setError("The API returned an unexpected investigation response. Reopen the incident to check its saved result.");
        return;
      }

      setResult(response);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setRunning(false);
    }
  }

  function exportReport() {
    setExportError("");

    if (!result) {
      setExportError("Run or open an investigation before exporting a report.");
      return;
    }

    try {
      const markdown = buildReportMarkdown(incident, result);
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(incident.title)}-report.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("The report could not be exported. Try again.");
    }
  }

  return (
    <section aria-labelledby="investigation-heading" aria-busy={running} className="mt-9 border-t border-line pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical size={20} className="text-accent" aria-hidden="true" />
            <h2 id="investigation-heading" className="text-xl font-semibold tracking-tight">
              AI investigation
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Review possible causes against log evidence and retrieved operational knowledge.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={exportReport}
            disabled={!result}
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm font-medium text-text-primary hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} aria-hidden="true" />
            Export report
          </button>

          <button
            type="button"
            onClick={runInvestigation}
            disabled={running}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
            ) : (
              <Play size={16} aria-hidden="true" />
            )}
            {running ? "Investigating…" : result ? "Run again" : "Investigate with AI"}
          </button>
        </div>
      </div>

      {running && (
        <div role="status" className="mt-5 rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm leading-6 text-text-secondary">
          Investigation requested. Waiting for the backend to return its analysis.
          {result && " The previous result remains visible below."}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-5 rounded-md border border-critical/30 bg-critical/5 px-4 py-3 text-sm leading-6 text-red-300">
          {error}
        </div>
      )}

      {exportError && (
        <div role="alert" className="mt-5 rounded-md border border-critical/30 bg-critical/5 px-4 py-3 text-sm leading-6 text-red-300">
          {exportError}
        </div>
      )}

      {!result && !running && (
        <div className="mt-6 rounded-lg border border-dashed border-line p-6">
          <h3 className="text-sm font-medium">No saved investigation</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
            Start an investigation to generate ranked hypotheses, evidence references, and suggested
            diagnostic checks.
          </p>
        </div>
      )}

      {result && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-xs text-text-secondary">
            <span>
              Analysis source:{" "}
              <span className="text-text-primary">{getAnalysisSourceLabel(result)}</span>
            </span>
            <span>{hypotheses.length} hypotheses</span>
            <span>{sources.length} retrieved sources</span>
          </div>

          <p className="mt-4 text-xs leading-6 text-text-muted">
            AI-generated hypotheses are not verified findings. Confidence is model-reported, not an
            independently calibrated probability. Validate suggested checks before executing commands
            or changing systems.
          </p>

          <div className="mt-6 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
              {hypotheses.length ? (
                hypotheses.map((hypothesis) => (
                  <HypothesisPanel
                    key={`${hypothesis.rank}-${hypothesis.summary}`}
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

            <aside aria-label="Retrieved knowledge" className="min-w-0 rounded-lg border border-line bg-surface p-5">
              <div className="flex items-center gap-2">
                <BookOpen size={17} className="text-accent" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Retrieved knowledge</h3>
              </div>

              <p className="mt-3 text-xs leading-6 text-text-muted">
                Retrieval scores are shown as returned by the backend. They are not confidence
                percentages.
              </p>

              {sources.length ? (
                <div className="mt-5 divide-y divide-line">
                  {sources.map((source, index) => (
                    <details
                      key={`${source.sourceFile}-${source.chunkIndex}-${index}`}
                      className="py-4 first:pt-0"
                    >
                      <summary className="cursor-pointer break-words text-sm font-medium text-text-primary">
                        {source.sourceFile}
                      </summary>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
                        <span>Chunk {source.chunkIndex}</span>
                        <span>
                          Score{" "}
                          {typeof source.score === "number" ? source.score.toFixed(4) : "Not available"}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-text-secondary">
                        {source.text}
                      </p>
                      <div className="mt-3">
                        <CopyButton text={source.text} label="retrieved passage" />
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-text-secondary">
                  No retrieved sources were returned for this investigation.
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}