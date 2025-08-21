import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toasts } from "./components/Toasts";
import { TodayCanvasScreen } from "./components/TodayCanvasScreen";

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-3 sm:p-6 flex flex-col gap-6">
        <TodayCanvasScreen />
        <Toasts />
      </div>
    </ErrorBoundary>
  );
}
