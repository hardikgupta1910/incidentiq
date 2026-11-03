import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import privacyService from "../../services/privacyService";
import { getApiErrorMessage } from "../../services/api";

export default function PrivacyControl({
  onPolicyChange,
  disabled = false,
}) {
  const { isAdmin } = useAuth();

  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    privacyService
      .get({ signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;

        setPolicy(response);
        onPolicyChange?.(response);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(requestError));
          onPolicyChange?.(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [attempt, onPolicyChange]);

  async function togglePrivacy() {
    if (!policy || saving || disabled || !isAdmin) return;

    const nextEnabled = !policy.enabled;

    const confirmed = nextEnabled
      ? false
      : window.confirm(
          "Disable privacy mode for the entire workspace?\n\n" +
            "Future cloud evaluations may send incident logs and " +
            "retrieved operational knowledge to external providers.\n\n" +
            "No evaluation will run automatically."
        );

    if (!nextEnabled && !confirmed) return;

    setSaving(true);
    setError("");

    try {
      const updated = await privacyService.update({
        enabled: nextEnabled,
        confirmed,
      });

      setPolicy(updated);
      onPolicyChange?.(updated);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));

      // Do not keep presenting an old policy as authoritative
      // after an ambiguous failed update.
      setPolicy(null);
      onPolicyChange?.(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck
              size={18}
              className="text-accent"
              aria-hidden="true"
            />
            Workspace privacy
          </h2>

          <p className="mt-2 text-xs leading-6 text-text-secondary">
            {loading
              ? "Loading privacy policy…"
              : !policy
                ? "Privacy policy unavailable."
                : policy.enabled
                  ? "Local processing only. Cloud evaluations are blocked."
                  : "Cloud evaluations are permitted when explicitly selected."}
          </p>

          {policy?.locked && (
            <p className="mt-1 text-xs text-warning">
              Locked by deployment configuration.
            </p>
          )}
        </div>

        {isAdmin && policy && (
          <button
            type="button"
            role="switch"
            aria-checked={policy.enabled}
            aria-label="Workspace privacy mode"
            onClick={togglePrivacy}
            disabled={saving || disabled || policy.locked}
            className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-line bg-elevated px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && (
              <LoaderCircle
                size={15}
                className="animate-spin"
                aria-hidden="true"
              />
            )}
            Privacy mode: {policy.enabled ? "On" : "Off"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-2 text-xs text-accent hover:underline"
          >
            Reload privacy policy
          </button>
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-text-muted">
        Changes apply to future permission checks. They do not cancel
        provider calls already in progress.
      </p>
    </section>
  );
}