import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'react-hot-toast';

const UpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      const toastId = toast.custom(
        (t) => (
          <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-white">
                    새로운 버전이 있습니다.
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    앱을 새로고침하여 업데이트하세요.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-700">
              <button
                onClick={() => {
                  updateServiceWorker(true);
                  toast.dismiss(toastId);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-500 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                업데이트
              </button>
              <button
                onClick={() => toast.dismiss(toastId)}
                className="w-full border border-transparent rounded-none p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                닫기
              </button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default UpdatePrompt;
