import { useEffect, useRef, useState } from "react";
import { FileUp, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import knowledgeBaseService from "../services/knowledgeBaseService";
import { getApiErrorMessage } from "../services/api";

export default function KnowledgeBase() {
  const { isAdmin } = useAuth();
  const inputRef = useRef(null);
  const actionLock = useRef(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    knowledgeBaseService.list({ search: query, status, offset: page * 10, signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        setData(response);
        const last = Math.max(0, Math.ceil(response.total / 10) - 1);
        if (page > last) setPage(last);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(getApiErrorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, status, page, attempt]);

  async function perform(key, operation) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(key); setActionError(""); setMessage("");
    try {
      await operation();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      actionLock.current = false;
      setBusy("");
      setAttempt((value) => value + 1);
    }
  }

  function upload(event) {
    event.preventDefault();
    if (!file) return;
    if (!/\.(pdf|md|txt)$/i.test(file.name) || file.size > 5000000 || file.size === 0) {
      setActionError("Select a non-empty PDF, Markdown, or text file no larger than 5,000,000 bytes.");
      return;
    }
    perform("upload", async () => {
      const result = await knowledgeBaseService.upload(file);
      if (result.status === "indexed") {
        setMessage(`Indexed ${result.filename}: ${result.chunk_count} chunks.`);
      } else {
        setActionError(result.error || "The document was saved but indexing did not complete. Retry from the list.");
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setPage(0);
    });
  }

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Manage technical documents used to retrieve operational guidance during investigations.</p>
      {isAdmin && <form onSubmit={upload} className="mt-7 rounded-lg border border-dashed border-line bg-surface p-5" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy && e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]); }}>
        <label htmlFor="knowledge-upload" className="block text-sm font-medium">Upload documentation</label>
        <p id="knowledge-upload-help" className="mt-2 text-xs leading-6 text-text-muted">Drop a file here or choose one below. PDF, .md, or UTF-8 .txt · 5 MB maximum · Text-based PDFs only, up to 100 pages. Files are parsed and embedded locally.</p>
        <input ref={inputRef} id="knowledge-upload" type="file" accept=".pdf,.md,.txt" aria-describedby="knowledge-upload-help" disabled={Boolean(busy)} onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-4 block w-full min-w-0 text-sm text-text-secondary file:mr-3 file:rounded-md file:border file:border-line file:bg-elevated file:px-3 file:py-2 file:text-text-primary" />
        {file && <p className="mt-3 break-all text-xs text-text-secondary">Selected: {file.name} · {(file.size / 1000).toFixed(1)} kB</p>}
        <button type="submit" disabled={!file || Boolean(busy)} className="mt-4 flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{busy === "upload" ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <FileUp size={16} aria-hidden="true" />}{busy === "upload" ? "Uploading and indexing…" : "Upload and index"}</button>
      </form>}
      {message && <p role="status" className="mt-4 text-sm text-success">{message}</p>}
      {actionError && <p role="alert" className="mt-4 text-sm leading-6 text-red-300">{actionError}</p>}
      <div className="mt-7 flex flex-wrap gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setQuery(input.trim()); setPage(0); setAttempt((v) => v + 1); }} className="flex min-w-0 flex-1 gap-2"><input type="search" aria-label="Search documents" placeholder="Search document filename" value={input} onChange={(e) => setInput(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent" /><button className="rounded-md border border-line px-3 text-sm hover:bg-elevated">Search</button></form>
        <select aria-label="Document status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="h-10 rounded-md border border-line bg-surface px-3 text-sm"><option value="">All statuses</option>{["uploaded", "processing", "indexed", "failed", "delete_failed"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
        <button type="button" onClick={() => setAttempt((v) => v + 1)} disabled={loading || Boolean(busy)} aria-label="Refresh documents" className="rounded-md border border-line px-3 disabled:opacity-40"><RefreshCw size={16} /></button>
      </div>
      {loading ? <p role="status" className="mt-6 text-sm text-text-secondary">Loading documents…</p> : error ? <p role="alert" className="mt-6 text-sm text-red-300">{error}</p> : <>
        <div className="technical-scroll mt-5 overflow-x-auto rounded-lg border border-line bg-surface"><table className="w-full text-left text-sm"><caption className="sr-only">Uploaded knowledge documents</caption><thead className="border-b border-line bg-sidebar text-xs text-text-muted"><tr>{["Document", "Size", "Uploaded", "Status", "Chunks", "Actions"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-line">{data.items.map((document) => <tr key={document.id}>
          <td className="min-w-[220px] px-4 py-4"><p className="break-words font-medium">{document.filename}</p><p className="mt-1 text-xs text-text-muted">{document.file_type.toUpperCase()}</p>{document.error && <p className="mt-2 max-w-md text-xs leading-5 text-red-300">{document.error}</p>}</td>
          <td className="whitespace-nowrap px-4 py-4 text-xs text-text-secondary">{(document.size_bytes / 1000).toFixed(1)} kB</td><td className="whitespace-nowrap px-4 py-4 text-xs text-text-muted">{new Date(document.created_at).toLocaleString()}</td><td className={`px-4 py-4 text-xs ${document.status === "indexed" ? "text-success" : "text-warning"}`}>{document.status.replaceAll("_", " ")}</td><td className="px-4 py-4 font-mono text-xs">{document.chunk_count}</td>
          <td className="px-4 py-4">{isAdmin ? <div className="flex items-center gap-3">{["failed", "uploaded"].includes(document.status) && <button type="button" disabled={Boolean(busy)} onClick={() => perform(document.id, async () => { const result = await knowledgeBaseService.retry(document.id); if (result.status !== "indexed") setActionError(result.error || "Indexing failed."); else setMessage(`Indexed ${result.filename}.`); })} className="text-xs text-accent disabled:opacity-40">Retry</button>}<button type="button" disabled={Boolean(busy)} aria-label={`Delete ${document.filename}`} onClick={() => { if (window.confirm(`Delete ${document.filename} and its uploaded document vectors? Existing independent runbook vectors and saved investigation snapshots will not be deleted.`)) perform(document.id, async () => { await knowledgeBaseService.remove(document.id); setMessage("Document deleted."); }); }} className="text-text-muted hover:text-critical disabled:opacity-40">{busy === document.id ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}</button></div> : <span className="text-xs text-text-muted">Read only</span>}</td>
        </tr>)}{!data.items.length && <tr><td colSpan={6} className="px-5 py-8 text-sm leading-6 text-text-secondary">No matching uploaded documents. Technical documentation improves retrieved troubleshooting guidance. Runbooks indexed by the standalone script remain searchable but are not tracked in this upload list.</td></tr>}</tbody></table></div>
        <div className="mt-4 flex items-center justify-between text-xs text-text-muted"><span>{data.total} documents</span><div className="flex gap-4"><button disabled={page === 0} onClick={() => setPage((v) => v - 1)} className="disabled:opacity-40">Previous</button><span>Page {page + 1}</span><button disabled={(page + 1) * 10 >= data.total} onClick={() => setPage((v) => v + 1)} className="disabled:opacity-40">Next</button></div></div>
      </>}
      <p className="mt-6 text-xs leading-6 text-text-muted">Extracted text is stored in MySQL and embedded into the existing runbooks collection. Retrieved passages may be included in cloud evaluations when workspace privacy permits. Upload only documents approved for this workspace. Ingestion runs within the request; there is no background progress stream.</p>
    </div>
  );
}
