import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-text-primary">
        <section role="alert" className="w-full max-w-lg rounded-lg border border-line bg-surface p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">IncidentIQ</p>
          <h1 className="mt-4 text-xl font-semibold">Unable to display this screen</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            The interface encountered an unexpected error. Returning to the overview
            will reload the application and may require you to sign in again.
            A running backend investigation is not cancelled by this action.
          </p>
          <button type="button" onClick={() => window.location.assign("/")}
            className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
            Return to overview
          </button>
        </section>
      </main>
    );
  }
}
