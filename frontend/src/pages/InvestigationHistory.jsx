import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, LoaderCircle } from "lucide-react";
import historyService from "../services/historyService";
import { getApiErrorMessage } from "../services/api";

function downloadResult(record) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `incidentiq-investigation-${record.id}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SavedResult({ id }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setRecord(null);
    setError("");
    historyService.get(id, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setRecord(data); })
      .catch((err) => { if (!controller.signal.aborted) setError(getApiErrorMessage(err)); });
    return () => controller.abort();
  }, [id, attempt]);

  if (error) return <div className="mt-6"><p role="alert" className="text-sm text-red-300">{error}</p><button type="button" onClick={() => setAttempt((v) => v + 1)} className="mt-3 text-sm text-accent">Retry</button></div>;
  if (!record) return <p role="status" className="mt-6 text-sm text-text-secondary">Loading saved investigation…</p>;

  return (
    <section className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Saved investigation</h2>
          <Link to={`/incidents/${record.incident_id}`} className="mt-2 inline-block text-sm text-accent hover:underline">{record.incident_title}</Link>
          <p className="mt-2 break-all font-mono text-xs text-text-muted">{record.id}</p>
        </div>
        <button type="button" onClick={() => downloadResult(record)} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm hover:bg-elevated"><Download size={16} aria-hidden="true" />Export JSON</button>
      </div>
      <p className="mt-4 text-xs leading-6 text-text-muted">Recorded {new Date(record.recorded_at).toLocaleString()} · {record.status}. Hypotheses are not verified root causes. Exact model identity and execution timing were not recorded.</p>
      <div className="mt-5 space-y-5">
        {record.result.hypotheses.map((hypothesis, index) => (
          <article key={index} className="rounded-lg border border-line bg-surface p-5">
            <p className="text-xs text-accent">Hypothesis {hypothesis.rank} · Reported confidence {(hypothesis.confidence * 100).toFixed(0)}%</p>
            <h3 className="mt-3 whitespace-pre-wrap break-words text-base leading-7">{hypothesis.summary}</h3>
            <h4 className="mt-5 text-xs font-semibold uppercase tracking-wider text-text-muted">Evidence</h4>
            <ul className="mt-3 space-y-3">
              {hypothesis.evidence.map((item, i) => <li key={i} className="border-l-2 border-line pl-3 text-sm leading-6 text-text-secondary"><span className="text-xs text-text-muted">{item.source_type}{item.line_number != null ? ` · Line ${item.line_number}` : ""}</span><p className="whitespace-pre-wrap break-words">{item.message}</p></li>)}
            </ul>
            {!hypothesis.evidence.length && <p className="mt-2 text-sm text-text-secondary">No evidence references returned.</p>}
            <h4 className="mt-5 text-xs font-semibold uppercase tracking-wider text-text-muted">Suggested checks</h4>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-text-secondary">{hypothesis.suggested_checks.map((check, i) => <li key={i} className="whitespace-pre-wrap break-words">{check}</li>)}</ol>
          </article>
        ))}
      </div>
      <h3 className="mt-7 text-sm font-semibold">Retrieved knowledge</h3>
      {(record.result.retrieved_sources || []).map((source, i) => <details key={i} className="mt-3 rounded-md border border-line bg-surface p-4"><summary className="cursor-pointer break-words text-sm">{source.source_file} · Chunk {source.chunk_index}</summary><p className="mt-2 text-xs text-text-muted">Retrieval score: {source.score} — not a confidence percentage</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">{source.text}</p></details>)}
      {!record.result.retrieved_sources?.length && <p className="mt-3 text-sm text-text-secondary">No retrieved sources were saved.</p>}
    </section>
  );
}

export default function InvestigationHistory() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    historyService.list({ search: query, offset: page * 10, signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setData(response); })
      .catch((err) => { if (!controller.signal.aborted) setError(getApiErrorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, attempt]);

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight">Investigation History</h1>
      <p className="mt-2 text-sm leading-6 text-text-secondary">Review saved results from previous investigation runs.</p>
      <form onSubmit={(e) => { e.preventDefault(); setQuery(input.trim()); setPage(0); setAttempt((v) => v + 1); }} className="mt-6 flex flex-wrap gap-2">
        <input type="search" aria-label="Search investigation history" placeholder="Search incident title or ID" value={input} onChange={(e) => setInput(e.target.value)} className="h-10 w-full max-w-md rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent" />
        <button className="rounded-md border border-line px-4 py-2 text-sm hover:bg-elevated">Search</button>
      </form>
      {loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm text-text-secondary"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Loading history…</p> : error ? <div className="mt-6"><p role="alert" className="text-sm text-red-300">{error}</p><button onClick={() => setAttempt((v) => v + 1)} className="mt-3 text-sm text-accent">Retry</button></div> : (
        <>
          <div className="technical-scroll mt-5 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-sm"><caption className="sr-only">Saved investigation runs, newest first</caption><thead className="border-b border-line bg-sidebar text-xs text-text-muted"><tr>{["Incident", "Investigation", "Status", "Recorded", "Action"].map((heading) => <th scope="col" key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">{data.items.map((item) => <tr key={item.id}><td className="min-w-[200px] px-4 py-4"><Link to={`/incidents/${item.incident_id}`} className="hover:text-accent">{item.incident_title}</Link></td><td className="px-4 py-4 font-mono text-xs text-text-muted" title={item.id}>{item.id.slice(0, 8)}</td><td className="px-4 py-4 text-xs">{item.status}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-text-secondary">{new Date(item.recorded_at).toLocaleString()}</td><td className="px-4 py-4"><button type="button" onClick={() => setParams({ id: item.id })} className="text-xs text-accent hover:underline">View result</button></td></tr>)}
              {!data.items.length && <tr><td colSpan={5} className="px-5 py-8 text-sm leading-6 text-text-secondary">No matching saved runs. History records new incident investigations after this feature is installed; older results remain on their incident detail pages.</td></tr>}</tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-text-muted"><span>{data.total} saved runs</span><div className="flex items-center gap-4"><button disabled={loading || page === 0} onClick={() => setPage((v) => v - 1)} className="disabled:opacity-40">Previous</button><span>Page {page + 1}</span><button disabled={loading || (page + 1) * 10 >= data.total} onClick={() => setPage((v) => v + 1)} className="disabled:opacity-40">Next</button></div></div>
        </>
      )}
      {selectedId && <><button type="button" onClick={() => setParams({})} className="mt-7 text-sm text-accent hover:underline">Close saved result</button><SavedResult key={selectedId} id={selectedId} /></>}
    </div>
  );
}
