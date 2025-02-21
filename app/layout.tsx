'use client';

import { SessionProvider } from 'next-auth/react';
import NavBar from './components/NavBar';
import Script from 'next/script';
import '../styles/globals.css';
import { ThemeProvider, CssBaseline, Switch, Box } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import Brightness2Icon from '@mui/icons-material/Brightness2';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use a tri-state for mode: null means not determined yet.
  const [mode, setMode] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const storedMode = localStorage.getItem('themeMode') as 'light' | 'dark' | null;
    setMode(storedMode ? storedMode : 'light');
  }, []);

  useEffect(() => {
    if (mode) {
      localStorage.setItem('themeMode', mode);
    }
  }, [mode]);

  // Always define an effective mode so hooks are called unconditionally.
  const effectiveMode = mode ?? 'light';
  const theme = useMemo(() => (effectiveMode === 'dark' ? darkTheme : lightTheme), [effectiveMode]);

  if (mode === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        Loading theme...
      </div>
    );
  }

  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
          `}
        </Script>
      </head>
      <body>
        <SessionProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <NavBar />
            {/* Dark mode toggle using a Switch with custom icons */}
            <Box sx={{ position: 'fixed', top: 8, left: 16, zIndex: 1300 }}>
              <Switch
                checked={effectiveMode === 'dark'}
                onChange={() => setMode(effectiveMode === 'light' ? 'dark' : 'light')}
                icon={<WbSunnyIcon sx={{ color: 'white' }} />}
                checkedIcon={<Brightness2Icon sx={{ color: 'white' }} />}
              />
            </Box>
            <div style={{ marginTop: '80px' }}>
              {children}
            </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}