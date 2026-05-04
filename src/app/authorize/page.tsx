'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AuthorizePage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password === '20250605') {
      // Set cookie for 7 days
      const d = new Date();
      d.setTime(d.getTime() + (7 * 24 * 60 * 60 * 1000));
      document.cookie = `momentum_authorized=true; path=/; expires=${d.toUTCString()}; SameSite=Lax`;
      
      toast.success('인증되었습니다.');
      router.push('/');
    } else {
      toast.error('비밀번호가 올바르지 않습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f9fafb]">
      <div className="w-full max-w-[400px] p-8 bg-white rounded-2xl shadow-sm border border-[#e5e8eb]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#191f28]">보안 인증</h1>
          <p className="mt-2 text-[#6b7684] text-sm">서비스 이용을 위해 비밀번호를 입력해주세요.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full p-4 bg-[#f2f4f6] rounded-xl outline-none focus:ring-2 focus:ring-[#3182f6] transition-all text-center text-lg tracking-widest"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#3182f6] text-white rounded-xl font-semibold hover:bg-[#1b64da] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? '확인 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
