import React from "react";
type P = {
    children: React.ReactNode;
    fallback?: React.ReactNode;
};
type S = {
    hasError: boolean;
    info?: string;
};
export declare class ErrorBoundary extends React.Component<P, S> {
    constructor(props: P);
    static getDerivedStateFromError(err: any): {
        hasError: boolean;
    };
    componentDidCatch(error: any, info: any): void;
    render(): any;
}
export {};
//# sourceMappingURL=ErrorBoundary.d.ts.map