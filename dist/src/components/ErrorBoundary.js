import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(err) { return { hasError: true }; }
    componentDidCatch(error, info) {
        console.error("[ErrorBoundary]", error, info);
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? _jsx("div", { className: "card", children: _jsx("div", { className: "text-sm", children: "\uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uAE30\uB2A5\uC740 \uACC4\uC18D \uB3D9\uC791\uD569\uB2C8\uB2E4." }) });
        }
        return this.props.children;
    }
}
