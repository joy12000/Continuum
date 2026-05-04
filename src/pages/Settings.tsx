'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import PageLayout from '../components/PageLayout';
import toast from 'react-hot-toast';

const SettingsCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-[12px] p-6 border border-[#e5e8eb] shadow-[0_1px_3px_rgba(25,31,40,0.04)] mb-6">
    <h2 className="text-[17px] font-semibold mb-6 text-[#191f28]" style={{ fontFamily: `'Pretendard Variable', sans-serif` }}>
      {title}
    </h2>
    {children}
  </div>
);

const Settings = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, gender, age_range, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setName(data.full_name || '');
          setGender(data.gender || '');
          setAge(data.age_range || '');
          setAvatarUrl(data.avatar_url || null);
        }
      } catch (error: any) {
        toast.error('프로필 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [router]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/avatar.${fileExt}`;

      // 1. Upload the file (upsert: true will overwrite if it exists)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update the profile with the new URL (add a timestamp to bust cache)
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithTimestamp })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithTimestamp);
      toast.success('프로필 이미지가 변경되었습니다.');
    } catch (error: any) {
      console.error(error);
      toast.error('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          full_name: name,
          gender,
          age_range: age,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('설정이 저장되었습니다.');
    } catch (error: any) {
      toast.error('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f9fafb] text-[#6b7684]" style={{ fontFamily: `'Pretendard Variable', sans-serif` }}>
        정보를 불러오고 있습니다..
      </div>
    );
  }

  return (
    <PageLayout title="설정">
      <div className="min-h-screen bg-[#f9fafb] pt-8 pb-20 px-4">
        {/* Mobile-first constraints: 480px max width centered */}
        <div className="max-w-[480px] mx-auto space-y-6">
          <div className="text-left mb-8 px-2">
            <h1 className="text-3xl font-bold text-[#191f28] tracking-[-0.01em]" style={{ fontFamily: `'Pretendard Variable', sans-serif` }}>
              설정
            </h1>
          </div>

          <SettingsCard title="프로필">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-[#f2f4f6] overflow-hidden flex items-center justify-center border-2 border-white shadow-sm">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-[32px] text-[#8b95a1] font-bold">
                      {name ? name[0] : '?'}
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#3182f6] rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-[#1b64da] transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                </label>
              </div>
              <p className="mt-3 text-[13px] text-[#8b95a1]">이미지를 터치하여 변경</p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col space-y-2">
                <label htmlFor="profile-name" className="text-[14px] font-medium text-[#6b7684] ml-1" style={{ fontFamily: `'Pretendard Variable', sans-serif` }}>
                  이름
                </label>
                <input 
                  id="profile-name" 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="이름을 입력하세요"
                  className="w-full p-[16px_20px] bg-[#f2f4f6] border-none rounded-[12px] text-[#191f28] placeholder-[#8b95a1] focus:ring-2 focus:ring-[#3182f6] outline-none transition-all"
                  style={{ fontFamily: `'Pretendard Variable', sans-serif` }}
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="profile-gender" className="text-[14px] font-medium text-[#6b7684] ml-1" style={{ fontFamily: `'Pretendard Variable', sans-serif` }}>
                  성별
                </label>
                <select 
                  id="profile-gender" 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)} 
                  className="w-full p-[16px_20px] bg-[#f2f4f6] border-none rounded-[12px] text-[#191f28] focus:ring-2 focus:ring-[#3182f6] outline-none transition-all appearance-none cursor-pointer"
                  style={{ fontFamily: `'Pretendard Variable', sans-serif` }}
                >
                  <option value="">선택 안함</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="profile-age" className="text-[14px] font-medium text-[#6b7684] ml-1" style={{ fontFamily: `'Pretendard Variable', sans-serif` }}>
                  나이
                </label>
                <select 
                  id="profile-age" 
                  value={age} 
                  onChange={(e) => setAge(e.target.value)} 
                  className="w-full p-[16px_20px] bg-[#f2f4f6] border-none rounded-[12px] text-[#191f28] focus:ring-2 focus:ring-[#3182f6] outline-none transition-all appearance-none cursor-pointer"
                  style={{ fontFamily: `'Pretendard Variable', sans-serif` }}
                >
                  <option value="">선택 안함</option>
                  <option value="10s">10대</option>
                  <option value="20s">20대</option>
                  <option value="30s">30대</option>
                  <option value="40s">40대</option>
                  <option value="50s">50대 이상</option>
                </select>
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full mt-4 py-[14px] bg-[#3182f6] hover:bg-[#1b64da] disabled:bg-[#d1d6db] text-white rounded-[7px] font-semibold transition-all active:scale-[0.98]"
                style={{ fontFamily: `'Pretendard Variable', sans-serif` }}
              >
                {isSaving ? '저장 중..' : '설정 저장하기'}
              </button>
            </div>
          </SettingsCard>

          <SettingsCard title="계정 관리">
            <button
              onClick={handleLogout}
              className="w-full p-[16px] bg-[#f04452]/10 text-[#f04452] rounded-[12px] hover:bg-[#f04452]/20 transition-all font-semibold active:scale-[0.98]"
              style={{ fontFamily: `'Pretendard Variable', sans-serif` }}
            >
              로그아웃
            </button>
          </SettingsCard>

          <div className="px-4 py-8 text-center">
            <div className="text-[13px] text-[#8b95a1]" style={{ fontFamily: `'Pretendard Variable', sans-serif` }}>
              앱 버전 v1.2.0-next
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Settings;
