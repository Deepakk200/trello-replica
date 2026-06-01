import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ui/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trello Clone',
  description: 'A feature-complete Trello clone with boards, lists, cards, drag-and-drop, labels, and more.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Trello Clone',
    description: 'A feature-complete Trello clone with boards, lists, cards, drag-and-drop, labels, and more.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#1D2125' },
    { media: '(prefers-color-scheme: light)', color: '#F7F8F9' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-trello-bg text-trello-text antialiased min-h-screen`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
