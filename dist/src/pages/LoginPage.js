import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
            brand: 'hsl(217, 80%, 60%)', // A more vibrant blue
            brandAccent: 'hsl(217, 80%, 70%)',
            brandButtonText: 'white',
            defaultButtonBackground: 'hsl(217, 30%, 25%)',
            defaultButtonBackgroundHover: 'hsl(217, 30%, 35%)',
            defaultButtonBorder: 'hsl(217, 30%, 25%)',
            defaultButtonText: 'white',
            dividerBackground: 'hsl(217, 20%, 25%)',
            inputBackground: 'hsl(220, 30%, 10%)', // Darker input
            inputBorder: 'hsl(217, 20%, 30%)',
            inputBorderHover: 'hsl(217, 80%, 60%)',
            inputBorderFocus: 'hsl(217, 80%, 60%)',
            inputText: 'white',
            inputLabelText: 'hsl(215, 20%, 75%)',
            inputPlaceholder: 'hsl(215, 20%, 55%)',
            messageText: 'hsl(215, 20%, 75%)',
            messageTextDanger: 'hsl(0, 70%, 60%)',
            anchorTextColor: 'hsl(217, 80%, 70%)',
            anchorTextHoverColor: 'hsl(217, 80%, 80%)',
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
    return (_jsx("div", { className: "flex items-center justify-center h-screen bg-background", children: _jsxs("div", { className: "w-full max-w-sm p-8 space-y-6 bg-card rounded-2xl shadow-lg border border-slate-700/50", children: [_jsxs("div", { className: "text-center", children: [_jsx("video", { src: "/aiiconmotion.mp4", autoPlay: true, loop: true, muted: true, playsInline: true, className: "w-24 h-24 mx-auto mb-4 rounded-full shadow-[0_0_16px_rgba(255,255,220,0.35)] object-cover", "aria-label": "Momentum Logo" }), _jsx("h1", { className: "text-3xl font-bold text-gray-200", children: "Momentum" }), _jsx("p", { className: "text-muted-foreground", children: "\uB85C\uADF8\uC778\uD558\uC5EC \uACC4\uC18D\uD558\uC138\uC694" })] }), _jsx(Auth, { supabaseClient: supabase, appearance: { theme: customTheme }, providers: ['google'], 
                    // localization={{ variables: ko }}
                    theme: "dark", redirectTo: window.location.origin })] }) }));
};
export default LoginPage;
