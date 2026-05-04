'use client';
import { supabase } from '../lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// Toss Design-inspired custom theme for the Auth component
const customTheme = {
  ...ThemeSupa,
  default: {
    ...ThemeSupa.default,
    colors: {
      ...ThemeSupa.default.colors,
      brand: '#3182f6', // Toss Blue
      brandAccent: '#1b64da', // Hover blue
      brandButtonText: '#f9fafb',
      defaultButtonBackground: '#e8f3ff', // secondary tinted blue
      defaultButtonBackgroundHover: '#e8f3ff',
      defaultButtonBorder: '#e8f3ff',
      defaultButtonText: '#1b64da',
      dividerBackground: '#e5e8eb', // border
      inputBackground: '#f2f4f6', // surface
      inputBorder: '#f2f4f6', // no border at rest
      inputBorderHover: '#e5e8eb',
      inputBorderFocus: '#3182f6', // focus ring
      inputText: '#191f28', // text near-ink
      inputLabelText: '#333d4b', // text-secondary
      inputPlaceholder: '#8b95a1', // text-dim
      messageText: '#6b7684', // text-muted
      messageTextDanger: '#f04452', // danger coral red
      anchorTextColor: '#6b7684',
      anchorTextHoverColor: '#3182f6',
    },
    space: {
      ...ThemeSupa.default.space,
      buttonPadding: '14px 20px',
      inputPadding: '16px 20px',
    },
    radii: {
      ...ThemeSupa.default.radii,
      borderRadiusButton: '7px',
      buttonBorderRadius: '7px',
      inputBorderRadius: '12px',
    },
    fonts: {
      ...ThemeSupa.default.fonts,
      bodyFontFamily: `'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`,
      buttonFontFamily: `'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`,
      labelFontFamily: `'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`,
    }
  },
};

const LoginPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      {/* Mobile-first constraints: 480px max width */}
      <div className="w-full max-w-[480px] p-8 space-y-8 bg-white md:border md:border-[#e5e8eb] md:rounded-2xl md:shadow-[0_1px_3px_rgba(25,31,40,0.04)]">
        <div className="text-center pt-8">
          {/* Tracking -1% tight spacing for headers */}
          <h1 className="text-3xl md:text-4xl font-bold text-[#191f28] tracking-[-0.01em]" style={{ fontFamily: `'Pretendard Variable', 'Pretendard', sans-serif` }}>
            Momentum
          </h1>
          <p className="mt-2 text-[#6b7684] text-[15px] font-medium" style={{ fontFamily: `'Pretendard Variable', 'Pretendard', sans-serif` }}>
            기록하고 연결하며 성장하는 당신을 위한 모멘텀
          </p>
        </div>
        {typeof window !== 'undefined' && (
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: customTheme }}
            providers={['google']}
            theme="default"
            redirectTo={window.location.origin}
            localization={{
              variables: {
                sign_in: {
                  email_label: '이메일 주소',
                  email_input_placeholder: '이메일 주소 입력',
                  password_label: '비밀번호',
                  password_input_placeholder: '비밀번호 입력',
                  button_label: '로그인하기',
                  loading_button_label: '로그인 중...',
                  social_provider_text: '{{provider}} 계정으로 시작하기',
                  link_text: '이미 계정이 있으신가요? 로그인하기',
                },
                sign_up: {
                  email_label: '이메일 주소',
                  email_input_placeholder: '이메일 주소 입력',
                  password_label: '비밀번호',
                  password_input_placeholder: '비밀번호 입력',
                  button_label: '가입하기',
                  loading_button_label: '가입 중...',
                  social_provider_text: '{{provider}} 계정으로 시작하기',
                  link_text: '계정이 없으신가요? 가입하기',
                },
                forgotten_password: {
                  email_label: '이메일 주소',
                  password_label: '비밀번호',
                  button_label: '비밀번호 재설정 메일 보내기',
                  loading_button_label: '메일 보내는 중...',
                  link_text: '비밀번호를 잊으셨나요?',
                },
                update_password: {
                  password_label: '새 비밀번호',
                  password_input_placeholder: '새 비밀번호를 입력하세요',
                  button_label: '비밀번호 변경하기',
                  loading_button_label: '변경 중...',
                },
              },
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LoginPage;
