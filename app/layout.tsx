// app/layout.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import NavBar from './components/NavBar';
import '../styles/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
