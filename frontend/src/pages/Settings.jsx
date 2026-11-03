import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { getApiErrorMessage } from "../services/api";
import healthService from "../services/healthService";

import PrivacyControl from "../components/investigation/PrivacyControl";

const SERVICE_LABELS = {
    mysql: "MySQL",
    qdrant: "Qdrant",
    ollama: "Ollama",
};

export default function Settings() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setError("");

        healthService
            .getProviders({
                signal: controller.signal,
            })
            .then((data) => {
                if (!controller.signal.aborted) setHealth(data);
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
        <div className="max-w-5xl">
            <h1 className="text-2xl font-semibold tracking-tight">
                Settings
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
                Workspace privacy and backend dependency status.
            </p>

            <PrivacyControl />

            <section className="mt-7 rounded-lg border border-line bg-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-sm font-semibold">
                        System dependencies
                    </h2>

                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => setAttempt((value) => value + 1)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs text-text-secondary hover:bg-elevated disabled:opacity-50"
                    >
                        <RefreshCw size={14} aria-hidden="true" />
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div
                        role="status"
                        className="mt-5 flex items-center gap-2 text-sm text-text-secondary"
                    >
                        <LoaderCircle
                            size={16}
                            className="animate-spin"
                            aria-hidden="true"
                        />
                        Checking dependencies…
                    </div>
                ) : error ? (
                    <p role="alert" className="mt-5 text-sm text-red-300">
                        {error}
                    </p>
                ) : health ? (
                    <>
                        <p className="mt-4 text-xs text-text-muted">
                            Overall backend dependency status: {health.status}
                        </p>

                        <dl className="mt-4 divide-y divide-line">
                            {Object.entries(health.providers || {}).map(
                                ([provider, status]) => (
                                    <div
                                        key={provider}
                                        className="flex items-center justify-between gap-4 py-4 text-sm"
                                    >
                                        <dt>{SERVICE_LABELS[provider] || provider}</dt>
                                        <dd
                                            className={
                                                status === "available"
                                                    ? "text-success"
                                                    : "text-warning"
                                            }
                                        >
                                            {status}
                                        </dd>
                                    </div>
                                )
                            )}
                        </dl>
                    </>
                ) : null}

                <p className="mt-5 border-t border-line pt-4 text-xs leading-6 text-text-muted">
                    These checks verify dependency connectivity. They do not
                    verify cloud credentials, model inference, or whether the
                    required knowledge has been indexed.
                </p>
            </section>
        </div>
    );
}