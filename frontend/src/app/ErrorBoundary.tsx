import { Component, type ReactNode } from "react";
import { Button } from "../components/ui/Button";
import { Notice } from "../components/ui/Primitives";

interface State { error: Error | null }

/** Keeps one broken view from taking the whole app down. The message is shown; the stack is not. */
export class ErrorBoundary extends Component<{ children: ReactNode; label?: string }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl p-6">
        <Notice tone="err" role="alert">
          <strong>{this.props.label ?? "This section"} stopped working.</strong>
          <div className="mt-1">{this.state.error.message}</div>
          <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => this.setState({ error: null })}>Try again</Button></div>
        </Notice>
      </div>
    );
  }
}
