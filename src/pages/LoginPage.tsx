import { supabase } from '../lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// Improved custom theme for the Auth component
const customTheme = {
  ...ThemeSupa,
  default: {
    ...ThemeSupa.default,
    colors: {
      ...ThemeSupa.default.colors,
      brand: 'hsl(217, 39%, 40%)', // accent color from tailwind.config.js
      brandAccent: 'hsl(217, 39%, 50%)',
      brandButtonText: 'white',
      defaultButtonBackground: 'hsl(217, 39%, 25%)', // secondary color
      defaultButtonBackgroundHover: 'hsl(217, 39%, 35%)',
      defaultButtonBorder: 'hsl(217, 39%, 25%)',
      defaultButtonText: 'white',
      dividerBackground: 'hsl(217, 39%, 25%)',
      inputBackground: 'hsl(222, 47%, 11%)', // background color
      inputBorder: 'hsl(217, 39%, 25%)',
      inputBorderHover: 'hsl(217, 39%, 40%)',
      inputBorderFocus: 'hsl(217, 39%, 40%)',
      inputText: 'white',
      inputLabelText: 'hsl(215, 20%, 65%)', // muted-foreground
      inputPlaceholder: 'hsl(215, 20%, 55%)',
      messageText: 'hsl(215, 20%, 65%)',
      messageTextDanger: 'hsl(0, 84%, 60%)', // destructive
      anchorTextColor: 'hsl(217, 39%, 40%)',
      anchorTextHoverColor: 'hsl(217, 39%, 50%)',
    },
    space: {
      ...ThemeSupa.default.space,
      buttonPadding: '0.75rem 1.5rem',
      inputPadding: '0.75rem 1rem',
    },
    radii: {
      ...ThemeSupa.default.radii,
      borderRadiusButton: '0.75rem', // Increased border radius
      buttonBorderRadius: '0.75rem',
      inputBorderRadius: '0.5rem',
    },
  },
};

const LoginPage = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 bg-card rounded-2xl shadow-lg">
        <div className="text-center">
          {/* Placeholder for a logo */}
          <div className="w-24 h-24 mx-auto mb-4 bg-primary rounded-full"></div>
          <h1 className="text-3xl font-bold text-primary-foreground">Continuum</h1>
          <p className="text-muted-foreground">Sign in to continue</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: customTheme }}
          providers={['google']}
          theme="dark"
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  );
};

export default LoginPage;
