'use client';

import React from 'react';

const GenerationProgress = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg shadow-xl animate-fadeIn">
      <div className="mb-4">
        <svg className="animate-spin h-12 w-12 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">AI揶쎛 ?諭?????룹퍟???怨뚭퍙??랁???됰뮸??덈뼄.</h3>
      <p className="text-gray-300 max-w-md">
        ?紐낅뱜??쇱뱽 ?브쑴苑??뤿연 ??덉쨮???紐꾧텢??꾨뱜??獄쏆뮄猿??롫뮉 餓λ쵐???덈뼄. ?醫롫뻻筌?疫꿸퀡???쇽폒?紐꾩뒄. ???⑥눘??? 筌????類ｋ즲 ???뒄??????됰뮸??덈뼄.
      </p>
    </div>
  );
};

export default GenerationProgress;
