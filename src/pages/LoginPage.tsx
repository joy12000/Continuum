import { supabase } from '../lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import '../styles/sky.css';

const LoginPage = () => {
  return (
    <div className="sky-root">
      <div className="sky-gradient" />
      <div className="sky-stars" />
      <div className="flex items-center justify-center h-full">
        <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 bg-opacity-50 rounded-lg">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
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