import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CDS - Convergence Digital Society',
  description: 'Shared expense management and automation system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-center" toastOptions={{
            style: { background: '#1a1b2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
          }} />
        </AuthProvider>
      </body>
    </html>
  );
}
