import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Pakistan Legal AI Agent | AI-Powered Legal Assistant',
  description: 'AI-powered legal assistant for Pakistan — analyze documents, generate drafts, research law, and assist law students.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" toastOptions={{
          style: { borderRadius: '10px', background: '#102a43', color: '#fff' },
        }} />
      </body>
    </html>
  );
}
