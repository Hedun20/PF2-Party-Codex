import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Party Codex render failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app-error-boundary" role="alert">
        <span className="kicker">Application recovery</span>
        <h1>This view could not be rendered.</h1>
        <p>Your campaign data was not changed. Reload the application; if the problem repeats, include the route and time in the issue report.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload Party Codex</button>
      </main>
    );
  }
}
