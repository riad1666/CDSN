import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { Toaster } from 'react-hot-toast';
import SWRegistration from '@/components/SWRegistration';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#1a1b2e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'CDS - Convergence Digital Society',
  description: 'Shared expense management and automation system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CDS',
  },
  icons: {
    apple: '/logo.png',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <CurrencyProvider>
          <AuthProvider>
            <SWRegistration />
            {children}
            <Toaster position="top-center" toastOptions={{
              style: { background: '#1a1b2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            }} />
          </AuthProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
