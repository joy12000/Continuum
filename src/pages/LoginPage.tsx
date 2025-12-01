import { useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
// import { ko } from '@supabase/auth-ui-shared/dist/esm/localization/locales';

// Refined custom theme for the Auth component
const customTheme = {
  ...ThemeSupa,
  default: {
    ...ThemeSupa.default,
    colors: {
      ...ThemeSupa.default.colors,
      brand: '#0ea5e9',
      brandAccent: '#38bdf8',
      brandButtonText: '#ffffff',
      defaultButtonBackground: '#ffffff',
      defaultButtonBackgroundHover: '#f1f5f9',
      defaultButtonBorder: '#e5e7eb',
      defaultButtonText: '#0f172a',
      dividerBackground: '#e5e7eb',
      inputBackground: '#ffffff',
      inputBorder: '#e5e7eb',
      inputBorderHover: '#cbd5e1',
      inputBorderFocus: '#0ea5e9',
      inputText: '#0f172a',
      inputLabelText: '#475569',
      inputPlaceholder: '#94a3b8',
      messageText: '#475569',
      messageTextDanger: '#dc2626',
      anchorTextColor: '#0ea5e9',
      anchorTextHoverColor: '#0284c7',
    },
    space: {
      ...ThemeSupa.default.space,
      buttonPadding: '0.875rem 1.5rem', // 14px
      inputPadding: '0.875rem 1rem',
    },
    radii: {
      ...ThemeSupa.default.radii,
      borderRadiusButton: '0.5rem', // 8px
      buttonBorderRadius: '0.5rem',
      inputBorderRadius: '0.5rem',
    },
    fonts: {
        ...ThemeSupa.default.fonts,
        bodyFontFamily: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
        buttonFontFamily: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
        labelFontFamily: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
    }
  },
};

const LoginPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      video.playbackRate = -1;
      video.play();
    };

    const handleTimeUpdate = () => {
      if (video.playbackRate < 0 && video.currentTime < 0.1) {
        video.playbackRate = 1;
        video.play();
      }
    };
    
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f6f7fb] px-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="text-center">
          <video
            ref={videoRef}
            src="/AIiconmotion.mp4"
            autoPlay
            muted
            playsInline
            className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-md object-cover"
            aria-label="Momentum Logo"
          ></video>
          <h1 className="text-3xl font-bold text-slate-900">Momentum</h1>
          <p className="text-slate-500">로그인하여 계속하세요</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: customTheme }}
          providers={['google']}
          // localization={{ variables: ko }}
          theme="default"
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  );
};

export default LoginPage;
