'use client';
// src/components/settings/DevToolsLink.tsx
import React from 'react';

export default function DevToolsLink(){
  return (
    <div className="mt-6 p-3 border rounded-xl bg-gray-50 text-sm">
      <div className="font-semibold mb-1">揶쏆뮆而???袁㏓럡</div>
      <ul className="list-disc ml-5 space-y-1">
        <li><a className="underline" href="/diagnostics">/diagnostics</a> (??깆뒭???怨뚭퍙 ???臾롫젏 揶쎛??</li>
        <li><a className="underline" href="/debug/api2.html">/debug/api2.html</a> (API ???わ㎗?꾧쾿)</li>
      </ul>
      <p className="text-gray-600 mt-2">雅뚯눘?? <code>src/App.tsx</code>????깆뒭?怨쀫퓠 <code>&lt;Diagnostics /&gt;</code>??野껋럥以???怨뚭퍙??곷튊 ??륁뵠筌왖揶쎛 癰귣똻???덈뼄. ?怨뚭퍙??? ??녿툡????슢諭?癒?뮉 ?怨밸샨 ??곷뮸??덈뼄.</p>
    </div>
  );
}
