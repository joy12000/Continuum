
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
      <h3 className="text-xl font-bold text-white mb-2">AI가 당신의 생각을 연결하고 있습니다.</h3>
      <p className="text-gray-300 max-w-md">
        노트들을 분석하여 새로운 인사이트를 발견하는 중입니다. 잠시만 기다려주세요. 이 과정은 몇 분 정도 소요될 수 있습니다.
      </p>
    </div>
  );
};

export default GenerationProgress;
