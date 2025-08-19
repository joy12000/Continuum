import React from "react";

type P = { children: React.ReactNode; fallback?: React.ReactNode };
type S = { hasError: boolean; info?: string };

export class ErrorBoundary extends React.Component<P, S> {
  constructor(props: P){ super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(err: any){ return { hasError: true }; }
  componentDidCatch(error: any, info: any){
    console.error("[ErrorBoundary]", error, info);
  }
  render(){
    if (this.state.hasError){
      return this.props.fallback ?? <div className="card"><div className="text-sm">문제가 발생했어요. 기능은 계속 동작합니다.</div></div>;
    }
    return this.props.children as any;
  }
}
