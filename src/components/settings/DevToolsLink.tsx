// src/components/settings/DevToolsLink.tsx
import React from 'react';

export default function DevToolsLink(){
  return (
    <div className="mt-6 p-3 border rounded-xl bg-gray-50 text-sm">
      <div className="font-semibold mb-1">개발자 도구</div>
      <ul className="list-disc ml-5 space-y-1">
        <li><a className="underline" href="/diagnostics">/diagnostics</a> (라우팅 연결 후 접근 가능)</li>
        <li><a className="underline" href="/debug/api2.html">/debug/api2.html</a> (API 헬스체크)</li>
      </ul>
      <p className="text-gray-600 mt-2">주의: <code>src/App.tsx</code>나 라우터에 <code>&lt;Diagnostics /&gt;</code>를 경로에 연결해야 페이지가 보입니다. 연결하지 않아도 빌드에는 영향 없습니다.</p>
    </div>
  );
}
