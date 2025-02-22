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

// Define light and dark themes.
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
  // Initialize with a lazy initializer.
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem('themeMode');
      return storedMode === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

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
            {/* Dark mode toggle positioned at top-left */}
            <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1300 }}>
              <Switch
                checked={mode === 'dark'}
                onChange={(e) => setMode(e.target.checked ? 'dark' : 'light')}
                // Always use white icons so they're visible on the black navbar.
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