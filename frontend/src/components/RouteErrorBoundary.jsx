import { Component } from "react";
import { PageLoadError } from "./PageLoadError";

export class RouteErrorBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (this.state.failed) {
            return <PageLoadError fullPage />;
        }
        return this.props.children;
    }
}
