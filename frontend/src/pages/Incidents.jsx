import { useState } from "react";
import { ArrowRight, FileUp, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import incidentService from "../services/incidentService";
import { getApiErrorMessage } from "../services/api";
import IncidentBrowser from "../components/incidents/IncidentBrowser";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Incidents() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [incidentId, setIncidentId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [lookupError, setLookupError] = useState("");

  async function handleUpload(event) {
    event.preventDefault();
    if (uploading) return;

    setUploadError("");

    if (!file) {
      setUploadError("Select a log file to upload.");
      return;
    }

    if (!/\.(log|txt)$/i.test(file.name)) {
      setUploadError("Only .log and .txt files are allowed.");
      return;
    }

    if (file.size > 1_000_000) {
      setUploadError("File must be 1 MB or smaller.");
      return;
    }

    setUploading(true);

    try {
      const incident = await incidentService.create(file);

      if (!incident?.id) {
        setUploadError("The API did not return an incident ID.");
        return;
      }

      navigate(`/incidents/${incident.id}`);
    } catch (error) {
      setUploadError(getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  function handleLookup(event) {
    event.preventDefault();
    setLookupError("");

    const value = incidentId.trim();

    if (!uuidPattern.test(value)) {
      setLookupError("Enter a valid incident UUID.");
      return;
    }

    navigate(`/incidents/${value}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Incidents
      </h1>

      <p className="mt-2 text-sm leading-6 text-text-secondary">
        Upload technical logs to create an incident, or open an existing
        investigation.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-lg border border-line bg-surface p-6">
          <div className="flex items-center gap-3">
            <FileUp size={20} className="text-accent" aria-hidden="true" />
            <h2 className="text-base font-semibold">Create an incident</h2>
          </div>

          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Upload a UTF-8 log file. Incident details are generated from
            the parsed log events.
          </p>

          <form onSubmit={handleUpload} className="mt-6 space-y-5">
            <div className="rounded-lg border border-dashed border-line bg-canvas p-5">
              <label
                htmlFor="incident-file"
                className="mb-3 block text-sm font-medium"
              >
                Log file
              </label>

              <input
                id="incident-file"
                type="file"
                accept=".log,.txt"
                disabled={uploading}
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setUploadError("");
                }}
                aria-describedby="file-help"
                className="block w-full min-w-0 text-sm text-text-secondary file:mr-4 file:rounded-md file:border file:border-solid file:border-line file:bg-elevated file:px-3 file:py-2 file:text-sm file:text-text-primary"
              />

              <p
                id="file-help"
                className="mt-3 text-xs text-text-muted"
              >
                .log or .txt · UTF-8 · Maximum 1,000,000 bytes
              </p>

              {file && (
                <p className="mt-3 break-all text-xs text-text-secondary">
                  {file.name} · {(file.size / 1000).toFixed(1)} kB
                </p>
              )}
            </div>

            {uploadError && (
              <p role="alert" className="text-sm text-red-300">
                {uploadError}
              </p>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <FileUp size={17} aria-hidden="true" />
              )}

              {uploading ? "Uploading and parsing…" : "Create incident"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-line bg-surface p-6">
          <h2 className="text-base font-semibold">
            Open an existing incident
          </h2>

          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Enter an incident ID to retrieve its logs and saved analysis.
          </p>

          <form onSubmit={handleLookup} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="incident-id"
                className="mb-2 block text-sm font-medium"
              >
                Incident ID
              </label>

              <input
                id="incident-id"
                value={incidentId}
                onChange={(event) => setIncidentId(event.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
                spellCheck={false}
                className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-mono text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {lookupError && (
              <p role="alert" className="text-sm text-red-300">
                {lookupError}
              </p>
            )}

            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-md border border-line bg-elevated px-4 text-sm hover:border-accent"
            >
              Open incident
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>

      <IncidentBrowser />
    </div>
  );
}