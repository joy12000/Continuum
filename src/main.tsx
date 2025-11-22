
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import './styles/sky.css';
import './styles/toast.css';
import './styles/modal.css';
import './styles/calendar.css';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// React Query 캐시 설정 최적화
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분 - 데이터가 5분간 fresh 상태 유지
      gcTime: 10 * 60 * 1000, // 10분 - 캐시가 10분간 유지됨 (cacheTime -> gcTime으로 변경됨)
      refetchOnWindowFocus: false, // 창 포커스 시 자동 refetch 비활성화
      refetchOnReconnect: true, // 네트워크 재연결 시에만 refetch
      retry: 1, // 실패 시 1번만 재시도
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
  });
}

