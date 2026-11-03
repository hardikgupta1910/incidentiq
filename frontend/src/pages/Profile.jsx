import { useAuth } from "../context/AuthContext";


export default function Profile() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Your IncidentIQ account information.
      </p>

      <dl className="mt-8 max-w-2xl divide-y divide-line rounded-lg border border-line bg-surface px-6">
        {[
          ["Username", user.username],
          ["Role", user.role],
          ["User ID", user.id],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid gap-2 py-5 text-sm sm:grid-cols-[120px_1fr]"
          >
            <dt className="text-text-secondary">{label}</dt>
            <dd className="break-all">{value}</dd>
          </div>
        ))}
      </dl>
     
    </div>
  );
}