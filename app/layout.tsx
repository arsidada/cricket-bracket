// app/layout.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import NavBar from './components/NavBar';
import Script from 'next/script';
import '../styles/globals.css';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics Scripts */}
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
          <NavBar />
          <div style={{ marginTop: '80px' }}>
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}