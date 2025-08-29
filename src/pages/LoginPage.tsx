import { supabase } from '../lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import '../styles/sky.css';

const customTheme = {
  ...ThemeSupa,
  default: {
    ...ThemeSupa.default,
    colors: {
      ...ThemeSupa.default.colors,
      brand: 'hsl(210, 80%, 60%)',
      brandAccent: 'hsl(210, 80%, 70%)',
      brandButtonText: 'white',
      defaultButtonBackground: 'rgba(255, 255, 255, 0.05)',
      defaultButtonBackgroundHover: 'rgba(255, 255, 255, 0.1)',
      defaultButtonBorder: 'rgba(255, 255, 255, 0.1)',
      defaultButtonText: 'white',
      dividerBackground: 'rgba(255, 255, 255, 0.1)',
      inputBackground: 'rgba(0, 0, 0, 0.2)',
      inputBorder: 'rgba(255, 255, 255, 0.1)',
      inputBorderHover: 'rgba(255, 255, 255, 0.2)',
      inputBorderFocus: 'hsl(210, 80%, 60%)',
      inputText: 'white',
      inputLabelText: 'rgba(255, 255, 255, 0.7)',
      inputPlaceholder: 'rgba(255, 255, 255, 0.4)',
      messageText: 'rgba(255, 255, 255, 0.7)',
      messageTextDanger: 'hsl(0, 80%, 70%)',
      anchorTextColor: 'hsl(210, 80%, 70%)',
      anchorTextHoverColor: 'hsl(210, 80%, 80%)',
    },
    space: {
      ...ThemeSupa.default.space,
      buttonPadding: '0.75rem 1.5rem',
      inputPadding: '0.75rem 1rem',
    },
    radii: {
      ...ThemeSupa.default.radii,
      borderRadiusButton: '0.5rem',
      buttonBorderRadius: '0.5rem',
      inputBorderRadius: '0.5rem',
    },
  },
};

const LoginPage = () => {
  return (
    <div className="sky-root">
      <div className="sky-gradient" />
      <div className="sky-stars" />
      <div className="flex items-center justify-center h-full p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: customTheme }}
            providers={['google']}
            theme="dark"
            redirectTo={window.location.origin}
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
